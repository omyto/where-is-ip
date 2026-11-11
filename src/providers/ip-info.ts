import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipInfo: Provider = {
  name: "ip-info",
  async lookup(ip) {
    const url = new URL("https://ip-info.com/json");
    if (ip) url.searchParams.set("ip", ip);
    const data = await fetchJson(url.href);
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
};
