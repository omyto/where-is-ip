import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipsb: Provider = {
  name: "ipsb",
  async lookup(ip) {
    const data = await fetchJson(`https://api.ip.sb/geoip/${ip}`);
    return normalizeLocation({
      countryCode: data.country_code,
      countryName: data.country,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    });
  },
};
