import { cloudflare } from "./cloudflare.js";
import { countryIs } from "./country-is.js";
import { freeipapi } from "./freeipapi.js";
import { geojs } from "./geojs.js";
import { ipInfo } from "./ip-info.js";
import { ip2location } from "./ip2location.js";
import { ipinfo } from "./ipinfo.js";
import { ipwhois } from "./ipwhois.js";
import type { Provider } from "./shared.js";

const allProviders = [
  ipwhois, ipInfo, geojs, countryIs,
  ipinfo, freeipapi, ip2location, cloudflare,
];

const isServer = typeof globalThis.location === "undefined";
export const providers: readonly Provider[] = isServer
  ? allProviders
  : allProviders.filter(provider => !provider.serverOnly);
