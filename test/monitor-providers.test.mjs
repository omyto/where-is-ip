import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
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
    message: "Address 192.0.2.1:443 is missing geolocation",
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
  }, Date.now, () => 0);

  assert.equal(urls.length, 15);
  assert.equal(new Set(urls.map(url => url.hostname)).size, 8);
  assert.equal(urls.filter(url => url.hostname === "www.cloudflare.com").length, 1);
  assert.equal(report.providers.ipwhois.caller.response.status, 200);
  assert.equal(report.providers.ipwhois.caller.error, "Missing country code");
  assert.deepEqual(JSON.parse(report.providers.ipwhois.caller.response.body), {
    success: true,
    ip: "[redacted]",
    message: "Address [redacted]:443 is missing geolocation",
    token: "[redacted]",
  });
  assert.equal(report.providers.ipwhois.specified.status, "ok");
  assert.equal(report.providers.cloudflare.specified, undefined);
  assert.match(renderSummary(report), /\| Provider \| Caller IP \| Specified IP \| Notes \|/);
  assert.match(renderSummary(report), /Specified IP checks used `8\.8\.8\.8`/);
  assert.doesNotMatch(renderSummary(report), /Server-side checks/);
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

  const first = await monitorProviders({}, fetch, Date.now, () => 0);
  assert.equal(first.providers.ipwhois.caller.status, "rate-limited");
  assert.equal(first.providers.ipwhois.specified.status, "skipped");
  urls.length = 0;
  const second = await monitorProviders(first, fetch, Date.now, () => 0);
  assert.ok(!urls.some(url => url.hostname === "ipwho.is"));
  assert.equal(second.providers["ip-info"].caller.consecutiveFailures, 0);
  assert.equal(second.providers["ip-info"].specified.consecutiveFailures, 2);
  errors = false;
  const third = await monitorProviders(second, fetch, Date.now, () => 0);
  assert.equal(third.providers["ip-info"].specified.consecutiveFailures, 0);
  assert.match(renderSummary(third), /Specified IP recovered/);
});

test("prints an aligned terminal table and keeps Markdown for redirected output", async () => {
  const { printReport } = await loadMonitor();
  const report = {
    checkedAt: "2026-11-17T00:17:00.000Z",
    probeIp: "1.1.1.1",
    providers: {
      "ip-info": {
        caller: { status: "ok", latencyMs: 142 },
        specified: { status: "error", error: "HTTP 503", consecutiveFailures: 3 },
      },
    },
  };

  for (const isTTY of [true, false]) {
    const stdout = new PassThrough();
    stdout.isTTY = isTTY;
    printReport(report, stdout);
    const output = stdout.read().toString();

    assert.match(output, /Specified IP failed 3 runs in a row/);
    assert.match(output, /Specified IP checks used .*1\.1\.1\.1/);
    if (isTTY) {
      assert.match(output, /┌.*┐/);
      assert.match(output, /│.*ip-info.*✓ 142 ms.*✗ HTTP 503.*│/);
      assert.doesNotMatch(output, /^## Provider monitor/m);
    } else {
      assert.match(output, /^## Provider monitor/m);
      assert.match(output, /\| `ip-info` \| ✓ 142 ms \| ✗ HTTP 503 \|/);
      assert.doesNotMatch(output, /┌/);
    }
  }
});

test("selects one probe IP for the whole run and records it in the report", async () => {
  const { monitorProviders } = await loadMonitor();
  const probes = ["8.8.8.8", "208.67.222.222", "google.com", "cloudflare.com", "apple.com", "microsoft.com", "amazon.com", "facebook.com"];
  for (const [index, selected] of probes.entries()) {
    const expected = index < 2 ? selected : "192.0.2.10";
    const targets = [];
    let selections = 0;
    const resolutions = [];
    const report = await monitorProviders({}, async input => {
      const url = new URL(input);
      if (url.hostname !== "www.cloudflare.com") {
        const target = url.searchParams.get("ip") ??
          url.pathname.match(/(?:^|\/)(\d+\.\d+\.\d+\.\d+)(?:\.json)?(?:\/json)?$/)?.[1];
        if (target) targets.push(target);
      }
      return new Response(null, { status: 503 });
    }, Date.now, () => { selections++; return index / probes.length; }, async domain => {
      resolutions.push(domain);
      return ["192.0.2.10", "192.0.2.20"];
    });
    assert.equal(report.probeTarget, selected);
    assert.equal(report.probeIp, expected);
    assert.equal(selections, 1);
    assert.deepEqual(resolutions, index < 2 ? [] : [selected]);
    assert.deepEqual(targets, Array(7).fill(expected));
  }
});

test("reports the domain and resolved IP in Markdown and terminal output", async () => {
  const { printReport } = await loadMonitor();
  const report = {
    checkedAt: "2026-11-20T02:15:00.000Z",
    probeTarget: "google.com",
    probeIp: "192.0.2.10",
    providers: {},
  };
  for (const isTTY of [true, false]) {
    const stdout = new PassThrough();
    stdout.isTTY = isTTY;
    printReport(report, stdout);
    assert.match(stdout.read().toString(), /google\.com → 192\.0\.2\.10/);
  }
});

test("fails on DNS errors or empty answers without falling back or calling providers", async () => {
  const { monitorProviders } = await loadMonitor();
  const dnsError = Object.assign(new Error("getaddrinfo ENOTFOUND google.com"), { code: "ENOTFOUND" });
  let requests = 0;
  const fetch = async () => { requests++; throw new Error("Unexpected provider request"); };
  await assert.rejects(monitorProviders({}, fetch, Date.now, () => 0.25, async () => {
    throw dnsError;
  }), error => error === dnsError);
  await assert.rejects(monitorProviders({}, fetch, Date.now, () => 0.25, async () => []), /No IPv4 address found for google\.com/);
  assert.equal(requests, 0);
});
