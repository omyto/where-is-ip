import { fetchJson, readCoordinate, readCountryCode, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const freeipapi: Provider = {
  name: "freeipapi",
  async lookup(ip) {
    const data = await fetchJson(`https://free.freeipapi.com/api/v1/json/${ip}`);
    const timeZones = data.timeZones;

    return {
      countryCode: readCountryCode(data.countryCode),
      countryName: readText(data.countryName),
      region: readText(data.regionName),
      city: readText(data.cityName),
      latitude: readCoordinate(data.latitude, 90),
      longitude: readCoordinate(data.longitude, 180),
      timezone: Array.isArray(timeZones) && timeZones.length === 1 ? readText(timeZones[0]) : null,
    };
  },
};
