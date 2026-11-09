import { fetchJson, normalizeLocation, readObject, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const ipsnapshot: Provider = {
  name: "ipsnapshot",
  async lookup(ip) {
    const response = await fetchJson(`https://ipsnapshot.com/api/ip/${ip}`);
    const data = readObject(response.data);
    if (response.success !== true || !data) {
      throw new Error(readText(response.message) ?? "Lookup was unsuccessful");
    }
    return normalizeLocation({
      countryCode: data.country_code,
      countryName: data.country,
      region: data.region,
      city: data.city,
    });
  },
};
