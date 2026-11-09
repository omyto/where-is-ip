# where-is-ip

Look up public IPv4 and IPv6 locations with automatic fallback and no API key.

## Install

Install [`where-is-ip`](https://www.npmjs.com/package/where-is-ip) from npm.

```sh
npm install where-is-ip
```

## Usage

The package supports modern browsers and Node.js 18 or later.

### npm

```js
import { geoip } from "where-is-ip";

const location = await geoip.lookup("8.8.8.8");
const currentLocation = await geoip.lookup();
```

For CommonJS, use `const { geoip } = require("where-is-ip")`.

### Browser via CDN

Import the ESM bundle from jsDelivr.

```html
<script type="module">
  import { geoip } from "https://cdn.jsdelivr.net/npm/where-is-ip@latest";

  console.log(await geoip.lookup("8.8.8.8"));
</script>
```

### Methods

| Method | Looks up |
| --- | --- |
| `geoip.lookup(ip)` | The specified public IPv4 or IPv6 address. |
| `geoip.lookup()` | The visitor's public IP in a browser or the server's outgoing IP in Node.js. |

### Result

```ts
export interface GeoIpResult {
  ip: string;
  countryCode: string;
  countryName: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  provider: string;
}
```

## Providers

Providers are tried in table order with a 2-second timeout per attempt.

| Provider | ID | Specified IP | Caller IP | Browser |
| --- | --- | :---: | :---: | :---: |
| [FreeIPAPI](https://freeipapi.com/) | `freeipapi` | ✓ | ✓ | ✓ |
| [IPWhois](https://ipwhois.io/) | `ipwhois` | ✓ | ✓ | ✓ |
| [GeoJS](https://www.geojs.io/) | `geojs` | ✓ | ✓ | ✓ |
| [IP2Location.io](https://www.ip2location.io/) | `ip2location` | ✓ | ✓ | — |
| [IP Info](https://ip-info.com/) | `ip-info` | ✓ | ✓ | ✓ |
| [IPinfo](https://ipinfo.io/) | `ipinfo` | ✓ | ✓ | ✓ |
| [Country.is](https://country.is/) | `country-is` | ✓ | ✓ | ✓ |
| [Cloudflare Trace](https://www.cloudflare.com/) | `cloudflare` | — | ✓ | ✓ |
