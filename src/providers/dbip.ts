import { fetchJson, normalizeLocation, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const dbip: Provider = {
  name: "dbip",
  serverOnly: true,
  async lookup(ip) {
    const data = await fetchJson(`https://api.db-ip.com/v2/free/${ip}`);
    if (data.errorCode) throw new Error(readText(data.error) ?? "Lookup was unsuccessful");
    return normalizeLocation({
      countryCode: data.countryCode,
      countryName: data.countryName,
      region: data.stateProv,
      city: data.city,
    });
  },
};
