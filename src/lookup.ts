import type { GeoIpResult } from "./index.js";
import { providers } from "./providers/index.js";
import { ProviderRateLimitError } from "./providers/shared.js";

const providerRetryTimes = new Map<string, number>();

export async function lookup(ip?: string): Promise<GeoIpResult> {
  const address = ip === undefined ? undefined : normalizeIp(ip);
  if (address !== undefined && isNonPublicIp(address)) {
    throw new RangeError(`${address} is not a public IP address and cannot be geolocated.`);
  }
  const errors: Error[] = [];

  for (const provider of providers) {
    if (address !== undefined && provider.callerOnly) continue;

    const retryAt = providerRetryTimes.get(provider.name);
    if (retryAt !== undefined) {
      if (retryAt > Date.now()) {
        errors.push(new Error(`${provider.name} is temporarily rate limited`));
        continue;
      }
      providerRetryTimes.delete(provider.name);
    }

    try {
      const { ip: detectedIp, countryCode, ...location } = await provider.lookup(address);
      if (!countryCode) {
        errors.push(new Error(`${provider.name} response did not include a country code`));
        continue;
      }
      return { ip: address ?? normalizeIp(detectedIp), countryCode, ...location, provider: provider.name };
    } catch (cause) {
      if (cause instanceof ProviderRateLimitError) {
        const currentRetryAt = providerRetryTimes.get(provider.name) ?? 0;
        providerRetryTimes.set(provider.name, Math.max(currentRetryAt, cause.retryAt));
      }
      errors.push(new Error(`${provider.name} lookup failed`, { cause }));
    }
  }

  throw new AggregateError(errors, `IP geolocation failed for ${address ?? "the caller"}`);
}

function normalizeIp(input: unknown): string {
  if (typeof input !== "string") throw new TypeError("Expected an IP address string");

  const ip = input.trim();
  const octets = ip.split(".");
  const validOctet = (octet: string) => /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255;
  if (octets.length === 4 && octets.every(validOctet)) return ip;

  if (ip.includes(":") && /^[a-f\d:.]+$/i.test(ip)) {
    try {
      // The URL parser validates bracketed IPv6 literals in both browsers and Node.js.
      new URL(`https://[${ip}]/`);
      return ip;
    } catch {
      // Report the same input error as for an invalid IPv4 address.
    }
  }

  throw new TypeError(`Invalid IP address: ${input}`);
}

function isNonPublicIp(ip: string): boolean {
  if (!ip.includes(":")) {
    const [first, second] = ip.split(".").map(Number);
    return isNonPublicIpv4(first, second);
  }

  // The URL parser canonicalizes IPv6, including IPv4-mapped addresses.
  const address = new URL(`https://[${ip}]/`).hostname.slice(1, -1);
  const mapped = address.match(/^::ffff:([a-f0-9]+):[a-f0-9]+$/);
  if (mapped) {
    const prefix = parseInt(mapped[1], 16);
    return isNonPublicIpv4(prefix >> 8, prefix & 0xff);
  }

  return address === "::1" ||
    /^f[cd][a-f0-9]{2}:/.test(address) ||
    /^fe[89ab][a-f0-9]:/.test(address);
}

function isNonPublicIpv4(first: number, second: number): boolean {
  return first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);
}
