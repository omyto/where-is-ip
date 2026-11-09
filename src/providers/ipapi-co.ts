import { fetchJson, normalizeLocation, readText, withSelfLookup } from "./shared.js";

export const ipapiCo = withSelfLookup({
  name: "ipapi-co",
  async lookup(ip) {
    const data = await fetchJson(`https://ipapi.co${ip ? `/${ip}` : ""}/json/`);
    if (data.error === true) throw new Error(readText(data.reason) ?? "Lookup was unsuccessful");
    return normalizeLocation({
      ip: data.ip,
      countryCode: data.country_code,
      countryName: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    });
  },
});
