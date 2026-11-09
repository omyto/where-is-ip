import { fetchJson, normalizeLocation, readObject, withSelfLookup } from "./shared.js";

export const countryIs = withSelfLookup({
  name: "country-is",
  async lookup(ip) {
    const data = await fetchJson(`https://api.country.is/${ip ?? ""}?fields=city,location`);
    const location = readObject(data.location);
    return normalizeLocation({
      ip: data.ip,
      countryCode: data.country,
      city: data.city,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
  },
});
