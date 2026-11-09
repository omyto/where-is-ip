import { fetchJson, normalizeLocation, readObject, withSelfLookup } from "./shared.js";

export const countriesDev = withSelfLookup({
  name: "countries-dev",
  async lookup(ip) {
    const url = ip ? `https://countries.dev/ip/${ip}` : "https://countries.dev/ip";
    const data = await fetchJson(url);
    return normalizeLocation({
      ip: data.ip,
      countryCode: data.countryCode,
      countryName: readObject(data.country)?.name,
    });
  },
});
