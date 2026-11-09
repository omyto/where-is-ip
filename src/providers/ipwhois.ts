import { fetchJson, normalizeLocation, readObject, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipwhois: Provider = {
  name: "ipwhois",
  async lookup(ip) {
    const data = await fetchJson(`https://ipwho.is/${ip}`);
    if (data.success !== true) throw new Error(readText(data.message) ?? "Lookup was unsuccessful");

    return normalizeLocation({
      countryCode: data.country_code,
      countryName: data.country,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: readObject(data.timezone)?.id,
    });
  },
};
