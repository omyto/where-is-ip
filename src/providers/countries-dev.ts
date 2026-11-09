import { fetchJson, normalizeLocation, readObject } from "./shared.js";
import type { Provider } from "./shared.js";

export const countriesDev: Provider = {
  name: "countries-dev",
  async lookup(ip) {
    const data = await fetchJson(`https://countries.dev/ip/${ip}`);
    return normalizeLocation({
      countryCode: data.countryCode,
      countryName: readObject(data.country)?.name,
    });
  },
};
