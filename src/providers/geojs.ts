import { fetchJson, normalizeLocation, withSelfLookup } from "./shared.js";

export const geojs = withSelfLookup({
  name: "geojs",
  async lookup(ip) {
    const data = await fetchJson(`https://get.geojs.io/v1/ip/geo${ip ? `/${ip}` : ""}.json`);

    return normalizeLocation({
      ip: data.ip,
      countryCode: data.country_code,
      countryName: data.country,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  },
});
