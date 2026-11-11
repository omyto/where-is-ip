import { cloudflare } from "./cloudflare.js";
import { countryIs } from "./country-is.js";
import { freeipapi } from "./freeipapi.js";
import { geojs } from "./geojs.js";
import { ipInfo } from "./ip-info.js";
import { ip2location } from "./ip2location.js";
import { ipinfo } from "./ipinfo.js";
import { ipwhois } from "./ipwhois.js";
import type { Provider } from "./shared.js";

const providers = [
  ipwhois, ipInfo, geojs, countryIs,
  ipinfo, freeipapi, ip2location, cloudflare,
];

export function getProviders(): Provider[] {
  const isServer = typeof globalThis.location === "undefined";
  return providers.filter(provider => isServer || !provider.serverOnly);
}
