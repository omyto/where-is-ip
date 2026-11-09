import type { GeoIpResult } from "../index.js";

type ProviderResult = Omit<GeoIpResult, "ip" | "provider"> & { ip: string | null };

export interface Provider {
  name: string;
  serverOnly?: boolean;
  lookup?(ip: string): Promise<ProviderResult>;
  lookupSelf?(): Promise<ProviderResult>;
}

export function withSelfLookup(provider: Omit<Provider, "lookup" | "lookupSelf"> & {
  lookup(ip?: string): Promise<ProviderResult>;
}): Provider {
  return { ...provider, lookupSelf: () => provider.lookup() };
}

export async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const data = readObject(await fetchBody(url, response => response.json(), init));
  if (!data) throw new Error("Expected a JSON object");
  return data;
}

export function fetchText(url: string): Promise<string> {
  return fetchBody(url, response => response.text());
}

async function fetchBody<T>(url: string, read: (response: Response) => Promise<T>, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return await read(response);
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeLocation(fields: Partial<Record<keyof ProviderResult, unknown>>): ProviderResult {
  return {
    ip: readText(fields.ip),
    countryCode: readCountryCode(fields.countryCode),
    countryName: readText(fields.countryName),
    region: readText(fields.region),
    city: readText(fields.city),
    latitude: readCoordinate(fields.latitude, 90),
    longitude: readCoordinate(fields.longitude, 180),
    timezone: readText(fields.timezone),
  };
}

export function readObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
}

export function readText(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text !== "-" ? text : null;
}

function readCountryCode(value: unknown): string | null {
  const code = readText(value)?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

function readCoordinate(value: unknown, limit: number): number | null {
  if (typeof value !== "number" && readText(value) === null) return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= limit ? coordinate : null;
}
