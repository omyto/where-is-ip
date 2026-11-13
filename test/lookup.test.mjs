import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const ip = "8.8.8.8";
const startTime = Date.UTC(2026, 0, 1);

function mockLookup(respond) {
  let now = startTime;
  const requests = [];

  class Clock extends Date {
    static now() {
      return now;
    }
  }

  const context = {
    Date: Clock,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    location: {},
    async fetch(input) {
      const url = new URL(input);
      requests.push(url.href);
      return respond(url);
    },
  };

  runInNewContext(bundle, context);
  return {
    geoip: context.geoip,
    requests,
    advance(ms) {
      now += ms;
    },
  };
}

function ipwhoisResult() {
  return new Response(JSON.stringify({ ip, success: true, country_code: "US" }));
}

function ipInfoResult() {
  return new Response(JSON.stringify({ ip, country: "US" }));
}

test("looks up a specified IP and the caller's IP", async () => {
  const { geoip, requests } = mockLookup(ipwhoisResult);

  for (const result of [await geoip.lookup(ip), await geoip.lookup()]) {
    assert.equal(result.ip, ip);
    assert.equal(result.countryCode, "US");
    assert.equal(result.provider, "ipwhois");
  }
  assert.deepEqual(requests, [`https://ipwho.is/${ip}`, "https://ipwho.is/"]);
});

test("rejects private IPs before contacting providers", async () => {
  const { geoip, requests } = mockLookup(ipwhoisResult);

  for (const address of [
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.2",
    "FC00::1",
    "fd12:3456::1",
    "::ffff:192.168.1.2",
    "0:0:0:0:0:ffff:c0a8:102",
  ]) {
    await assert.rejects(geoip.lookup(address), {
      name: "RangeError",
      message: `${address} is not a public IP address and cannot be geolocated.`,
    });
  }
  assert.deepEqual(requests, []);
});

test("accepts addresses outside the private ranges", async () => {
  const { geoip } = mockLookup(ipwhoisResult);

  for (const address of ["172.15.0.1", "172.32.0.1", "2001:4860::8888", "::ffff:8.8.8.8"]) {
    assert.equal((await geoip.lookup(address)).ip, address);
  }
});

test("falls back after a server error and tries the first provider on the next lookup", async () => {
  let attempts = 0;
  const { geoip } = mockLookup(url => {
    if (url.hostname !== "ipwho.is") return ipInfoResult();
    attempts++;
    return attempts === 1 ? new Response(null, { status: 503 }) : ipwhoisResult();
  });

  assert.equal((await geoip.lookup(ip)).provider, "ip-info");
  assert.equal((await geoip.lookup(ip)).provider, "ipwhois");
});

for (const { label, headers, delay } of [
  { label: "Retry-After in seconds", headers: { "Retry-After": "120" }, delay: 120_000 },
  {
    label: "Retry-After as an HTTP date",
    headers: { "Retry-After": new Date(startTime + 60_000).toUTCString() },
    delay: 60_000,
  },
  { label: "missing Retry-After", headers: {}, delay: 30_000 },
  { label: "invalid Retry-After", headers: { "Retry-After": "-1" }, delay: 30_000 },
]) {
  test(`skips a rate-limited provider until its retry time with ${label}`, async () => {
    let attempts = 0;
    const { geoip, requests, advance } = mockLookup(url => {
      if (url.hostname !== "ipwho.is") return ipInfoResult();
      attempts++;
      return attempts === 1 ? new Response(null, { status: 429, headers }) : ipwhoisResult();
    });

    assert.equal((await geoip.lookup(ip)).provider, "ip-info");
    advance(delay - 1);
    assert.equal((await geoip.lookup()).provider, "ip-info");
    assert.deepEqual(requests, [
      `https://ipwho.is/${ip}`,
      `https://ip-info.com/json?ip=${ip}`,
      "https://ip-info.com/json",
    ]);
    advance(1);
    assert.equal((await geoip.lookup(ip)).provider, "ipwhois");
  });
}

test("rejects without sending requests when all eligible providers are cooling down", async () => {
  const { geoip, requests } = mockLookup(() => new Response(null, { status: 429 }));

  await assert.rejects(geoip.lookup(ip), { name: "AggregateError" });
  const requestCount = requests.length;
  assert.ok(requestCount > 1);
  await assert.rejects(geoip.lookup(ip), { name: "AggregateError" });
  assert.equal(requests.length, requestCount);
});

test("uses Cloudflare as the final fallback for caller IP only", async () => {
  const traceUrl = "https://www.cloudflare.com/cdn-cgi/trace";
  const { geoip, requests } = mockLookup(url => {
    if (url.href === traceUrl) return new Response(`ip=${ip}\nloc=US\n`);
    return new Response(null, { status: 503 });
  });

  const result = await geoip.lookup();
  assert.equal(result.provider, "cloudflare");
  assert.equal(result.ip, ip);
  assert.equal(requests.at(-1), traceUrl);
  assert.ok(requests.length > 1);

  requests.length = 0;
  await assert.rejects(geoip.lookup(ip), { name: "AggregateError" });
  assert.ok(!requests.includes(traceUrl));
});
