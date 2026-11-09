import { fetchJson, readCoordinate, readCountryCode, readText } from "./shared.js";
import type { Provider } from "./shared.js";

export const geojs: Provider = {
  name: "geojs",
  async lookup(ip) {
    const data = await fetchJson(`https://get.geojs.io/v1/ip/geo/${ip}.json`);

    return {
      countryCode: readCountryCode(data.country_code),
      countryName: readText(data.country),
      region: readText(data.region),
      city: readText(data.city),
      latitude: readCoordinate(data.latitude, 90),
      longitude: readCoordinate(data.longitude, 180),
      timezone: readText(data.timezone),
    };
  },
};
