import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipInfo: Provider = {
  name: "ip-info",
  async lookup(ip) {
    const data = await fetchJson(`https://ip-info.com/json?ip=${encodeURIComponent(ip)}`);
    return normalizeLocation({
      countryCode: data.country,
      countryName: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    });
  },
};
