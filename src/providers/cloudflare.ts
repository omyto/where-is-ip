import { fetchText, normalizeLocation } from "./shared.js";
import type { Provider } from "./shared.js";

export const cloudflare: Provider = {
  name: "cloudflare",
  callerOnly: true,
  async lookup() {
    const trace = await fetchText("https://www.cloudflare.com/cdn-cgi/trace");
    const ip = trace.match(/^ip=(.*)$/m)?.[1];
    const countryCode = trace.match(/^loc=(.*)$/m)?.[1].trim().toUpperCase();

    return normalizeLocation({
      ip,
      countryCode: countryCode === "XX" ? null : countryCode,
    });
  },
};
