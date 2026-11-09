import { cloudflare } from "./cloudflare.js";
import { countryIs } from "./country-is.js";
import { freeipapi } from "./freeipapi.js";
import { geojs } from "./geojs.js";
import { ipApi } from "./ip-api.js";
import { ipInfo } from "./ip-info.js";
import { ip2location } from "./ip2location.js";
import { ipapiIs } from "./ipapi-is.js";
import { ipinfo } from "./ipinfo.js";
import { ipsb } from "./ipsb.js";
import { ipsnapshot } from "./ipsnapshot.js";
import { ipwhois } from "./ipwhois.js";
import type { Provider } from "./shared.js";

const defaultProviders = [
  freeipapi, ipwhois, geojs, ip2location, ipInfo, ipinfo, ipapiIs,
  countryIs, cloudflare,
];
const providers = [...defaultProviders, ipsb, ipsnapshot, ipApi];

export function getProviders(names?: readonly string[]): Provider[] {
  const selected = names?.map(name => {
    const provider = providers.find(provider => provider.name === name);
    if (!provider) throw new TypeError(`Unknown geolocation provider: ${name}`);
    return provider;
  }) ?? defaultProviders;

  const isServer = typeof globalThis.location === "undefined";
  const available = selected.filter(provider => isServer || !provider.serverOnly);
  if (available.length === 0) throw new TypeError("No geolocation provider available in this runtime");
  return available;
}
