import { lookup, lookupMany } from "./lookup.js";

export interface GeoIpResult {
  ip: string;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  provider: string;
}

export interface LookupOptions {
  providers?: readonly string[];
}

export const geoip: {
  lookup(ip: string, options?: LookupOptions): Promise<GeoIpResult>;
  lookupMany(ips: readonly string[], options?: LookupOptions): Promise<GeoIpResult[]>;
} = { lookup, lookupMany };
