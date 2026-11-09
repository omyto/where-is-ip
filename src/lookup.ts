import type { GeoIpResult } from "./index.js";
import { providers } from "./providers/index.js";

const batchConcurrency = 4;

export async function lookup(ip: string): Promise<GeoIpResult> {
  return lookupFromProviders(normalizeIp(ip));
}

export async function lookupMany(ips: readonly string[]): Promise<GeoIpResult[]> {
  if (!Array.isArray(ips)) throw new TypeError("Expected an array of IP addresses");

  const addresses = Array.from(ips, normalizeIp);
  const results: GeoIpResult[] = [];

  for (let offset = 0; offset < addresses.length; offset += batchConcurrency) {
    const batch = addresses.slice(offset, offset + batchConcurrency);
    const locations = await Promise.all(batch.map(lookupFromProviders));
    results.push(...locations);
  }

  return results;
}

async function lookupFromProviders(ip: string): Promise<GeoIpResult> {
  const errors: Error[] = [];

  for (const provider of providers) {
    try {
      const location = await provider.lookup(ip);
      if (!location.countryCode && !location.countryName) {
        throw new Error("Response did not include a country");
      }
      return { ip, ...location, provider: provider.name };
    } catch (cause) {
      errors.push(new Error(`${provider.name} lookup failed`, { cause }));
    }
  }

  throw new AggregateError(errors, `IP geolocation failed for ${ip}`);
}

function normalizeIp(input: string): string {
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
