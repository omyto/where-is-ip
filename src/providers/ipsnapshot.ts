import { fetchJson, normalizeLocation, readObject, readText, withSelfLookup } from "./shared.js";

export const ipsnapshot = withSelfLookup({
  name: "ipsnapshot",
  async lookup(ip) {
    const response = await fetchJson(`https://ipsnapshot.com/api/ip/${ip ?? "self"}`);
    const data = readObject(response.data);
    if (response.success !== true || !data) {
      throw new Error(readText(response.message) ?? "Lookup was unsuccessful");
    }
    return normalizeLocation({
      ip: response.ip,
      countryCode: data.country_code,
      countryName: data.country,
      region: data.region,
      city: data.city,
    });
  },
});
