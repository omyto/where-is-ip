import { fetchJson, normalizeLocation, readText, withSelfLookup } from "./shared.js";

export const ipApi = withSelfLookup({
  name: "ip-api",
  serverOnly: true,
  async lookup(ip) {
    const data = await fetchJson(`http://ip-api.com/json/${ip ?? ""}?fields=status,message,query,country,countryCode,regionName,city,lat,lon`);
    if (data.status !== "success") throw new Error(readText(data.message) ?? "Lookup was unsuccessful");
    return normalizeLocation({
      ip: data.query,
      countryCode: data.countryCode,
      countryName: data.country,
      region: data.regionName,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
    });
  },
});
