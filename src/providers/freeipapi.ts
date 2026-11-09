import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const freeipapi: Provider = {
  name: "freeipapi",
  async lookup(ip) {
    const data = await fetchJson(`https://free.freeipapi.com/api/v1/json/${ip}`);
    const timeZones = data.timeZones;

    return normalizeLocation({
      countryCode: data.countryCode,
      countryName: data.countryName,
      region: data.regionName,
      city: data.cityName,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: Array.isArray(timeZones) && timeZones.length === 1 ? timeZones[0] : null,
    });
  },
};
