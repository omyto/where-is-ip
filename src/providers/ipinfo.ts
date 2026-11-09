import { fetchJson, normalizeLocation, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipinfo: Provider = {
  name: "ipinfo",
  async lookup(ip) {
    const data = await fetchJson(`https://ipinfo.io/${ip}/json`);
    const [latitude, longitude] = readText(data.loc)?.split(",") ?? [];
    return normalizeLocation({
      countryCode: data.country,
      region: data.region,
      city: data.city,
      latitude,
      longitude,
      timezone: data.timezone,
    });
  },
};
