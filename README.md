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
const locations = await geoip.lookupMany(["8.8.8.8", "1.1.1.1"]);
```

For CommonJS, use `const { geoip } = require("ip-geolocation")`.

Both methods return the same location fields for each IP. The result includes `ip`, `countryCode`, `countryName`, `region`, `city`, `latitude`, `longitude`, `timezone`, and `provider`. Missing location fields are `null`. `lookupMany` preserves input order and rejects if any IP cannot be looked up.

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

Both lookup methods accept an optional `providers` array to set the fallback order for that call.

```js
const location = await geoip.lookup("8.8.8.8", { providers: ["geojs", "country-is"] });
```

| Availability | Provider IDs |
| --- | --- |
| Default, browser and server | `freeipapi`, `ipwhois`, `geojs`, `ip-info`, `ipinfo`, `ipapi-is`, `country-is`, `countries-dev` |
| Default, server only | `ip2location`, `dbip`, `iplocation-net` |
| Explicit selection, personal use or evaluation depending on the provider | `ipsb`, `ipapi-co`, `ipsnapshot` |
| Explicit selection, server only, plain HTTP and non-commercial use | `ip-api` |

`countries-dev` and `iplocation-net` return country-level results. Check the free-tier terms for [IP.SB](https://ip.sb/pricing/), [ipapi.co](https://ipapi.co/), [IPSnapshot](https://ipsnapshot.com/ip-lookup-api), and [IP-API.com](https://ip-api.com/docs/legal) before selecting them.

## Build locally

```sh
npm install
npm run build
```

The build creates `dist/index.js`, `dist/index.cjs`, and their TypeScript declarations. To try the browser build locally, serve the project over HTTP and use `./dist/index.js` as the import URL.
