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
const locations = await geoip.lookupMany(["8.8.8.8", "1.1.1.1"]);
```

For CommonJS, use `const { geoip } = require("ip-geolocation")`.

With no IP argument, `lookup()` uses the caller's public IP. Call it in the browser to locate the visitor's connection, or on the server to locate the server's outgoing connection.

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

For caller IP lookups with a custom order, pass `undefined` as the first argument. For example, `geoip.lookup(undefined, { providers: ["cloudflare"] })` uses Cloudflare Trace to get the caller's IP and country code.

| Provider ID | `lookup(ip)` | `lookup()` | Browser | Default |
| --- | :---: | :---: | :---: | :---: |
| `freeipapi` | ✓ | ✓ | ✓ | ✓ |
| `ipwhois` | ✓ | ✓ | ✓ | ✓ |
| `geojs` | ✓ | ✓ | ✓ | ✓ |
| `ip2location` | ✓ | ✓ | — | ✓ |
| `ip-info` | ✓ | ✓ | ✓ | ✓ |
| `ipinfo` | ✓ | ✓ | ✓ | ✓ |
| `dbip` | ✓ | ✓ | — | ✓ |
| `ipapi-is` | ✓ | ✓ | ✓ | ✓ |
| `country-is` | ✓ | ✓ | ✓ | ✓ |
| `countries-dev` | ✓ | ✓ | ✓ | ✓ |
| `iplocation-net` | ✓ | — | — | ✓ |
| `cloudflare` | — | ✓ | ✓ | ✓ |
| `ipsb` | ✓ | ✓ | ✓ | — |
| `ipapi-co` | ✓ | ✓ | ✓ | — |
| `ipsnapshot` | ✓ | ✓ | ✓ | — |
| `ip-api` | ✓ | ✓ | — | — |

All providers can run on the server for their supported lookup modes. The default providers are tried in the order shown. A dash in **Default** means you must select that provider explicitly.

`countries-dev`, `iplocation-net`, and `cloudflare` return country-level results. The free tiers of [IP.SB](https://ip.sb/pricing/), [ipapi.co](https://ipapi.co/), and [IPSnapshot](https://ipsnapshot.com/ip-lookup-api) have personal-use or evaluation limits. [IP-API.com](https://ip-api.com/docs/legal) uses plain HTTP and allows non-commercial use only on its free tier.

## Build locally

```sh
npm install
npm run build
```

The build creates `dist/index.js`, `dist/index.cjs`, and their TypeScript declarations. To try the browser build locally, serve the project over HTTP and use `./dist/index.js` as the import URL.
