import { fetchJson, normalizeLocation, readText, withSelfLookup } from "./shared.js";

export const dbip = withSelfLookup({
  name: "dbip",
  serverOnly: true,
  async lookup(ip) {
    const data = await fetchJson(`https://api.db-ip.com/v2/free/${ip ?? "self"}`);
    if (data.errorCode) throw new Error(readText(data.error) ?? "Lookup was unsuccessful");
    return normalizeLocation({
      ip: data.ipAddress,
      countryCode: data.countryCode,
      countryName: data.countryName,
      region: data.stateProv,
      city: data.city,
    });
  },
});
