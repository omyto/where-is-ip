import { fetchJson, normalizeLocation, withSelfLookup } from "./shared.js";

export const ipInfo = withSelfLookup({
  name: "ip-info",
  async lookup(ip) {
    const url = ip ? `https://ip-info.com/json?ip=${encodeURIComponent(ip)}` : "https://ip-info.com/json";
    const data = await fetchJson(url);
    return normalizeLocation({
      ip: data.ip,
      countryCode: data.country,
      countryName: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  },
});
