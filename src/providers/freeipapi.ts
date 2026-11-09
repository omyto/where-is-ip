import { fetchJson, normalizeLocation, withSelfLookup } from "./shared.js";

export const freeipapi = withSelfLookup({
  name: "freeipapi",
  async lookup(ip) {
    const url = ip ? `https://free.freeipapi.com/api/v1/json/${ip}` : "https://free.freeipapi.com/api/v1/json";
    const data = await fetchJson(url);
    const timeZones = data.timeZones;

    return normalizeLocation({
      ip: data.ipAddress,
      countryCode: data.countryCode,
      countryName: data.countryName,
      region: data.regionName,
      city: data.cityName,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: Array.isArray(timeZones) && timeZones.length === 1 ? timeZones[0] : null,
    });
  },
});
