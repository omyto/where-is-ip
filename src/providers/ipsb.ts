import { fetchJson, normalizeLocation, withSelfLookup } from "./shared.js";

export const ipsb = withSelfLookup({
  name: "ipsb",
  async lookup(ip) {
    const url = ip ? `https://api.ip.sb/geoip/${ip}` : "https://api.ip.sb/geoip";
    const data = await fetchJson(url);
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
