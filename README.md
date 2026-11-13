# where-is-ip

Look up public IPv4 and IPv6 locations with automatic fallback and no API key.  
[Live Demo](https://omyto.github.io/where-is-ip/#demo)

## Usage

### Install with npm

Requires Node.js 18 or later.

```sh
npm install where-is-ip
```

```js
import { geoip } from "where-is-ip";

const location = await geoip.lookup("8.8.8.8");
const currentLocation = await geoip.lookup();
```

*\* For CommonJS, use `const { geoip } = require("where-is-ip")`.*

### Use in the browser via CDN

Add these scripts to an HTML page.

```html
<script src="https://cdn.jsdelivr.net/npm/where-is-ip@latest/dist/index.global.js"></script>
<script>
  geoip.lookup("8.8.8.8")
    .then(console.log)
    .catch(console.error);
</script>
```

*\* The same file is available on [UNPKG](https://unpkg.com/where-is-ip@latest/dist/index.global.js).*

## API

| Method | Looks up |
| --- | --- |
| `geoip.lookup(ip)` | The specified public IPv4 or IPv6 address. |
| `geoip.lookup()` | The visitor's public IP in a browser or the server's outgoing IP in Node.js. |

### Result

```ts
interface GeoIpResult {
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

Fields marked `| null` are `null` when the provider has no usable data for them.

## Providers

Each provider attempt has a 2-second timeout.

| Provider | ID | Specified IP | Caller IP | Browser |
| --- | --- | :---: | :---: | :---: |
| [Country.is](https://country.is/) | `country-is` | ✓ | ✓ | ✓ |
| [FreeIPAPI](https://freeipapi.com/) | `freeipapi` | ✓ | ✓ | ✓ |
| [GeoJS](https://www.geojs.io/) | `geojs` | ✓ | ✓ | ✓ |
| [IP Info](https://ip-info.com/) | `ip-info` | ✓ | ✓ | ✓ |
| [IP2Location.io](https://www.ip2location.io/) | `ip2location` | ✓ | ✓ | — |
| [IPinfo](https://ipinfo.io/) | `ipinfo` | ✓ | ✓ | ✓ |
| [IPWhois](https://ipwhois.io/) | `ipwhois` | ✓ | ✓ | ✓ |
| [Cloudflare Trace](https://www.cloudflare.com/) | `cloudflare` | — | ✓ | ✓ |

*\* Cloudflare Trace is the final fallback for `lookup()`.*
