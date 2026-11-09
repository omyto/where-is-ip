# ip-geolocation

Look up public IPv4 and IPv6 locations with automatic fallback and no API key.

## Install

Install [`ip-geolocation`](https://www.npmjs.com/package/ip-geolocation) from npm.

```sh
npm install ip-geolocation
```

## Usage

The package supports modern browsers and Node.js 18 or later.

```js
import { geoip } from "ip-geolocation";

const location = await geoip.lookup("8.8.8.8");
const currentLocation = await geoip.lookup();
```

For CommonJS, use `const { geoip } = require("ip-geolocation")`.

With no IP argument, `lookup()` uses the caller's public IP. Call it in the browser to locate the visitor's connection, or on the server to locate the server's outgoing connection.

The result includes `ip`, `countryCode`, `countryName`, `region`, `city`, `latitude`, `longitude`, `timezone`, and `provider`. Missing location fields are `null`.

`lookup()` rejects if the input is invalid or no selected provider can return a location.

## Browser via CDN

Use `ip-geolocation` directly in an HTML page served over HTTP or HTTPS. Import the ESM bundle from jsDelivr without installing the package locally.

```html
<script type="module">
  import { geoip } from "https://cdn.jsdelivr.net/npm/ip-geolocation@latest";

  console.log(await geoip.lookup("8.8.8.8"));
</script>
```

Use a specific version instead of `@latest` if you want the page to load the same release every time. The browser sends lookups directly to each provider, so CORS and provider rate limits apply.

## Providers

`lookup()` accepts an optional `providers` array to set the fallback order for that call.

```js
const location = await geoip.lookup("8.8.8.8", { providers: ["geojs", "country-is"] });
```

For caller IP lookups with a custom order, pass `undefined` as the first argument. For example, `geoip.lookup(undefined, { providers: ["cloudflare"] })` uses Cloudflare Trace to get the caller's IP and country code.

| Provider | ID | Specified IP | Caller IP | Browser | In default chain |
| --- | --- | :---: | :---: | :---: | :---: |
| [FreeIPAPI](https://freeipapi.com/) | `freeipapi` | ✓ | ✓ | ✓ | ✓ |
| [IPWhois](https://ipwhois.io/) | `ipwhois` | ✓ | ✓ | ✓ | ✓ |
| [GeoJS](https://www.geojs.io/) | `geojs` | ✓ | ✓ | ✓ | ✓ |
| [IP2Location.io](https://www.ip2location.io/) | `ip2location` | ✓ | ✓ | — | ✓ |
| [IP Info](https://ip-info.com/) | `ip-info` | ✓ | ✓ | ✓ | ✓ |
| [IPinfo](https://ipinfo.io/) | `ipinfo` | ✓ | ✓ | ✓ | ✓ |
| [DB-IP](https://db-ip.com/) | `dbip` | ✓ | ✓ | — | ✓ |
| [ipapi.is](https://ipapi.is/) | `ipapi-is` | ✓ | ✓ | ✓ | ✓ |
| [Country.is](https://country.is/) | `country-is` | ✓ | ✓ | ✓ | ✓ |
| [Cloudflare Trace](https://www.cloudflare.com/) | `cloudflare` | — | ✓ | ✓ | ✓ |
| [IP.SB](https://ip.sb/) | `ipsb` | ✓ | ✓ | ✓ | — |
| [IPSnapshot](https://ipsnapshot.com/) | `ipsnapshot` | ✓ | ✓ | ✓ | — |
| [IP-API.com](https://ip-api.com/) | `ip-api` | ✓ | ✓ | — | — |

**Specified IP** corresponds to `lookup(ip)`, and **Caller IP** corresponds to `lookup()`. The **In default chain** column shows which providers are tried when `providers` is omitted. The library tries them in table order and skips any that do not support the current runtime or lookup mode. A dash in that column means the provider requires explicit selection.

`cloudflare` returns country-level results.

The opt-in providers have restrictions on their free tiers. [IP.SB](https://ip.sb/pricing/) and [IPSnapshot](https://ipsnapshot.com/ip-lookup-api) allow personal use and evaluation. [IP-API.com](https://ip-api.com/docs/legal) uses plain HTTP and allows non-commercial use only on its free tier.

## Build locally

```sh
npm install
npm run build
```

The build creates `dist/index.js`, `dist/index.cjs`, and their TypeScript declarations. To try the browser build locally, serve the project over HTTP and use `./dist/index.js` as the import URL.

## License

[MIT](LICENSE)
