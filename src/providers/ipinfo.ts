import { fetchJson, normalizeLocation, readText, withSelfLookup } from "./shared.js";

export const ipinfo = withSelfLookup({
  name: "ipinfo",
  async lookup(ip) {
    const data = await fetchJson(`https://ipinfo.io${ip ? `/${ip}` : ""}/json`);
    const [latitude, longitude] = readText(data.loc)?.split(",") ?? [];
    return normalizeLocation({
      ip: data.ip,
      countryCode: data.country,
      region: data.region,
      city: data.city,
      latitude,
      longitude,
    });
  },
});
