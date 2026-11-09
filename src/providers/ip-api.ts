import { fetchJson, normalizeLocation, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipApi: Provider = {
  name: "ip-api",
  serverOnly: true,
  async lookup(ip) {
    const data = await fetchJson(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone`);
    if (data.status !== "success") throw new Error(readText(data.message) ?? "Lookup was unsuccessful");
    return normalizeLocation({
      countryCode: data.countryCode,
      countryName: data.country,
      region: data.regionName,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
    });
  },
};
