import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const ip2location: Provider = {
  name: "ip2location",
  serverOnly: true,
  async lookup(ip) {
    const url = new URL("https://api.ip2location.io/?format=json");
    if (ip) url.searchParams.set("ip", ip);
    const data = await fetchJson(url.href);
    return normalizeLocation({
      ip: data.ip,
      countryCode: data.country_code,
      countryName: data.country_name,
      region: data.region_name,
      city: data.city_name,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  },
};
