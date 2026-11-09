import type { GeoIpResult } from "../index.js";

export interface Provider {
  name: string;
  lookup(ip: string): Promise<Omit<GeoIpResult, "ip" | "provider">>;
}

export async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = readObject(await response.json());
    if (!data) throw new Error("Expected a JSON object");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function readObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
}

export function readText(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

export function readCountryCode(value: unknown): string | null {
  const code = readText(value)?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

export function readCoordinate(value: unknown, limit: number): number | null {
  if (typeof value !== "number" && readText(value) === null) return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= limit ? coordinate : null;
}
