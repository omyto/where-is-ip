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

export const geoip: {
  lookup(ip: string): Promise<GeoIpResult>;
  lookupMany(ips: readonly string[]): Promise<GeoIpResult[]>;
} = { lookup, lookupMany };
