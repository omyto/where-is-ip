import { fetchJson, normalizeLocation, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const iplocationNet: Provider = {
  name: "iplocation-net",
  serverOnly: true,
  async lookup(ip) {
    const data = await fetchJson("https://api.iplocation.net/v2/ip-country", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip }),
    });
    if (String(data.response_code) !== "200") {
      throw new Error(readText(data.response_message) ?? "Lookup was unsuccessful");
    }
    return normalizeLocation({
      countryCode: data.country_code2,
      countryName: data.country_name,
    });
  },
};
