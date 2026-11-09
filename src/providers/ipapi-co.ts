import { fetchJson, normalizeLocation, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipapiCo: Provider = {
  name: "ipapi-co",
  async lookup(ip) {
    const data = await fetchJson(`https://ipapi.co/${ip}/json/`);
    if (data.error === true) throw new Error(readText(data.reason) ?? "Lookup was unsuccessful");
    return normalizeLocation({
      countryCode: data.country_code,
      countryName: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    });
  },
};
