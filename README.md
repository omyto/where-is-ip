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

The result includes `ip`, `countryCode`, `countryName`, `region`, `city`, `latitude`, `longitude`, and `provider`. Missing location fields are `null`.

`lookup()` rejects if the input is invalid or no provider can return a location.

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

The library tries providers in table order and skips any that do not support the current runtime or lookup mode. Each attempt has a 2-second timeout. **Specified IP** corresponds to `lookup(ip)`, and **Caller IP** corresponds to `lookup()`.

| Provider | ID | Specified IP | Caller IP | Browser |
| --- | --- | :---: | :---: | :---: |
| [FreeIPAPI](https://freeipapi.com/) | `freeipapi` | ✓ | ✓ | ✓ |
| [IPWhois](https://ipwhois.io/) | `ipwhois` | ✓ | ✓ | ✓ |
| [GeoJS](https://www.geojs.io/) | `geojs` | ✓ | ✓ | ✓ |
| [IP2Location.io](https://www.ip2location.io/) | `ip2location` | ✓ | ✓ | — |
| [IP Info](https://ip-info.com/) | `ip-info` | ✓ | ✓ | ✓ |
| [IPinfo](https://ipinfo.io/) | `ipinfo` | ✓ | ✓ | ✓ |
| [ipapi.is](https://ipapi.is/) | `ipapi-is` | ✓ | ✓ | ✓ |
| [Country.is](https://country.is/) | `country-is` | ✓ | ✓ | ✓ |
| [Cloudflare Trace](https://www.cloudflare.com/) | `cloudflare` | — | ✓ | ✓ |

`cloudflare` returns country-level results.

## Build locally

```sh
npm install
npm run build
```

The build creates `dist/index.js`, `dist/index.cjs`, and their TypeScript declarations. To try the browser build locally, serve the project over HTTP and use `./dist/index.js` as the import URL.

## License

[MIT](LICENSE)
