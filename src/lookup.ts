import type { GeoIpResult } from "./index.js";
import { getProviders } from "./providers/index.js";
import { ProviderRateLimitError } from "./providers/shared.js";

const providerRetryTimes = new Map<string, number>();

export async function lookup(ip?: string): Promise<GeoIpResult> {
  const address = ip === undefined ? undefined : normalizeIp(ip);
  const providers = getProviders();
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
