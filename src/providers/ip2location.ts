import { fetchJson, normalizeLocation, withSelfLookup } from "./shared.js";

export const ip2location = withSelfLookup({
  name: "ip2location",
  serverOnly: true,
  async lookup(ip) {
    const url = ip ? `https://api.ip2location.io/?ip=${encodeURIComponent(ip)}` : "https://api.ip2location.io/?format=json";
    const data = await fetchJson(url);
    return normalizeLocation({
      ip: data.ip,
      countryCode: data.country_code,
      countryName: data.country_name,
      region: data.region_name,
      city: data.city_name,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  },
});
