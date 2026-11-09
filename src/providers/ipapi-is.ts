import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipapiIs: Provider = {
  name: "ipapi-is",
  async lookup(ip) {
    const data = await fetchJson(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`);
    if (data.is_bogon === true) throw new Error("IP address is not publicly routable");
    return normalizeLocation({
      countryName: data.country,
      region: data.region,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
    });
  },
};
