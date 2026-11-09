import { fetchJson, normalizeLocation, withSelfLookup } from "./shared.js";

export const ipapiIs = withSelfLookup({
  name: "ipapi-is",
  async lookup(ip) {
    const url = ip ? `https://api.ipapi.is/?q=${encodeURIComponent(ip)}` : "https://api.ipapi.is/";
    const data = await fetchJson(url);
    if (data.is_bogon === true) throw new Error("IP address is not publicly routable");
    return normalizeLocation({
      ip: data.ip,
      countryName: data.country,
      region: data.region,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
    });
  },
});
