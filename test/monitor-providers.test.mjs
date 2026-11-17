import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

async function loadMonitor() {
  const { outputFiles } = await build({
    entryPoints: ["scripts/monitor-providers.mjs"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);
}

test("checks both lookup modes directly and keeps the failing response without exposing the caller IP", async () => {
  const { monitorProviders, renderSummary } = await loadMonitor();
  const urls = [];
  const response = {
    ip: "2001:4860::8888",
    message: "Address 192.0.2.1 is missing geolocation",
    token: "secret",
  };
  const report = await monitorProviders({}, async input => {
    const url = new URL(input);
    urls.push(url);
    if (url.hostname === "ipwho.is" && url.pathname === "/8.8.8.8") {
      return Response.json({ success: true, ip: "8.8.8.8", country_code: "US" });
    }
    if (url.hostname === "ipwho.is") return Response.json({ success: true, ...response });
    if (url.hostname === "www.cloudflare.com") return new Response("ip=8.8.4.4\nloc=US\n");
    return new Response("Service unavailable", { status: 503 });
  });

  assert.equal(urls.length, 15);
  assert.equal(new Set(urls.map(url => url.hostname)).size, 8);
  assert.equal(urls.filter(url => url.hostname === "www.cloudflare.com").length, 1);
  assert.equal(report.providers.ipwhois.caller.response.status, 200);
  assert.equal(report.providers.ipwhois.caller.error, "Missing country code");
  assert.deepEqual(JSON.parse(report.providers.ipwhois.caller.response.body), {
    success: true,
    ip: "[redacted]",
    message: "Address [redacted] is missing geolocation",
    token: "[redacted]",
  });
  assert.equal(report.providers.ipwhois.specified.status, "ok");
  assert.equal(report.providers.cloudflare.specified, undefined);
  assert.match(renderSummary(report), /\| Provider \| Caller IP \| Specified IP \(8\.8\.8\.8\) \| Notes \|/);
});

test("respects the saved retry time and counts failures by lookup mode", async () => {
  const { monitorProviders, renderSummary } = await loadMonitor();
  const urls = [];
  let errors = true;
  const fetch = async input => {
    const url = new URL(input);
    urls.push(url);
    if (url.hostname === "ipwho.is") {
      return new Response(null, { status: 429, headers: { "Retry-After": "120" } });
    }
    if (url.hostname === "ip-info.com" && (!url.searchParams.has("ip") || !errors)) {
      return Response.json({ country: "US" });
    }
    return new Response(null, { status: 503 });
  };

  const first = await monitorProviders({}, fetch);
  assert.equal(first.providers.ipwhois.caller.status, "rate-limited");
  assert.equal(first.providers.ipwhois.specified.status, "skipped");
  urls.length = 0;
  const second = await monitorProviders(first, fetch);
  assert.ok(!urls.some(url => url.hostname === "ipwho.is"));
  assert.equal(second.providers["ip-info"].caller.consecutiveFailures, 0);
  assert.equal(second.providers["ip-info"].specified.consecutiveFailures, 2);
  errors = false;
  const third = await monitorProviders(second, fetch);
  assert.equal(third.providers["ip-info"].specified.consecutiveFailures, 0);
  assert.match(renderSummary(third), /Specified IP recovered/);
});
