import type { GeoIpResult } from "../index.js";

type Location = Omit<GeoIpResult, "ip" | "provider">;

export interface Provider {
  name: string;
  serverOnly?: boolean;
  lookup(ip: string): Promise<Location>;
}

export async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = readObject(await response.json());
    if (!data) throw new Error("Expected a JSON object");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeLocation(fields: Partial<Record<keyof Location, unknown>>): Location {
  return {
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
