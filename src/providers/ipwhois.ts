import { fetchJson, normalizeLocation, readText, withSelfLookup } from "./shared.js";

export const ipwhois = withSelfLookup({
  name: "ipwhois",
  async lookup(ip) {
    const data = await fetchJson(`https://ipwho.is/${ip ?? ""}`);
    if (data.success !== true) throw new Error(readText(data.message) ?? "Lookup was unsuccessful");

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
