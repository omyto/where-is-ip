import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const ip2location: Provider = {
  name: "ip2location",
  serverOnly: true,
  async lookup(ip) {
    const data = await fetchJson(`https://api.ip2location.io/?ip=${encodeURIComponent(ip)}`);
    return normalizeLocation({
      countryCode: data.country_code,
      countryName: data.country_name,
      region: data.region_name,
      city: data.city_name,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  },
};
