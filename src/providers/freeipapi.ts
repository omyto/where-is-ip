import { fetchJson, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const freeipapi: Provider = {
  name: "freeipapi",
  async lookup(ip) {
    const data = await fetchJson(`https://free.freeipapi.com/api/v1/json${ip ? `/${ip}` : ""}`);

    return normalizeLocation({
      ip: data.ipAddress,
      countryCode: data.countryCode,
      countryName: data.countryName,
      region: data.regionName,
      city: data.cityName,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  },
};
