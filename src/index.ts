import { lookup } from "./lookup.js";

export interface GeoIpResult {
  ip: string;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  provider: string;
}

export const geoip: {
  lookup(ip?: string): Promise<GeoIpResult>;
} = { lookup };
