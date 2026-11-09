import { fetchJson, readCoordinate, readCountryCode, readObject, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipwhois: Provider = {
  name: "ipwhois",
  async lookup(ip) {
    const data = await fetchJson(`https://ipwho.is/${ip}`);
    if (data.success !== true) throw new Error(readText(data.message) ?? "Lookup was unsuccessful");

    return {
      countryCode: readCountryCode(data.country_code),
      countryName: readText(data.country),
      region: readText(data.region),
      city: readText(data.city),
      latitude: readCoordinate(data.latitude, 90),
      longitude: readCoordinate(data.longitude, 180),
      timezone: readText(readObject(data.timezone)?.id),
    };
  },
};
