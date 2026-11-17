import { readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { providers } from "../src/providers/index.js";
import { ProviderRateLimitError } from "../src/providers/shared.js";

const PROBE_IP = "8.8.8.8";
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MODES = { caller: "Caller IP", specified: "Specified IP" };

function redactBody(body, mode) {
  const sensitiveKey = /^(?:authorization|cookie|set[_-]?cookie|api[_-]?key|.*token|password|secret)$/i;
  try {
    body = JSON.stringify(JSON.parse(body), (key, value) => sensitiveKey.test(key) ? "[redacted]" : value, 2);
  } catch {
    // Providers may return plain text or HTML.
  }
  if (mode === "caller") {
    body = body.replace(/[0-9a-f:.]+/gi, candidate => {
      const address = candidate.replace(/^\.+|\.+$/g, "");
      return isIP(address) ? candidate.replace(address, "[redacted]") : candidate;
    });
  }
  return body;
}

async function readBody(response) {
  if (!response.body) return { body: "", truncated: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return { body: body + decoder.decode(), truncated: false };
      const remaining = MAX_RESPONSE_BYTES - bytes;
      if (value.byteLength > remaining) {
        body += decoder.decode(value.subarray(0, remaining));
        void reader.cancel().catch(() => {});
        return { body, truncated: true };
      }
      bytes += value.byteLength;
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

async function probe(provider, mode, previous, fetch, now) {
  const savedFetch = globalThis.fetch;
  const started = now();
  let response;
  let error;
  // Adapters use the global fetch. Probes run serially in this CLI process.
  globalThis.fetch = async (input, init) => {
    const upstream = await fetch(input, init);
    response = {
      status: upstream.status,
      contentType: upstream.headers.get("Content-Type"),
    };
    if (upstream.status === 429) {
      void upstream.body?.cancel().catch(() => {});
      return upstream;
    }
    const { body, truncated } = await readBody(upstream);
    response.body = truncated ? null : redactBody(body, mode);
    response.truncated = truncated;
    return new Response(upstream.body === null ? null : body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  };

  try {
    const result = mode === "caller" ? await provider.lookup() : await provider.lookup(PROBE_IP);
    if (result.countryCode && !response?.truncated) {
      return {
        status: "ok",
        latencyMs: now() - started,
        consecutiveFailures: 0,
        recovered: (previous?.consecutiveFailures ?? 0) > 0,
      };
    }
    error = "Missing country code";
  } catch (cause) {
    if (cause instanceof ProviderRateLimitError) {
      return { status: "rate-limited", retryAt: cause.retryAt, consecutiveFailures: previous?.consecutiveFailures ?? 0 };
    }
    error = cause?.name === "AbortError" ? "Timeout" :
      response?.status >= 400 ? `HTTP ${response.status}` : "Lookup failed";
  } finally {
    globalThis.fetch = savedFetch;
  }

  return {
    status: "error",
    error: response?.truncated ? "Response exceeds 1 MiB" : error,
    response,
    latencyMs: now() - started,
    consecutiveFailures: (previous?.consecutiveFailures ?? 0) + 1,
  };
}

export async function monitorProviders(previous = {}, fetch = globalThis.fetch, now = Date.now) {
  const checkedAt = new Date(now()).toISOString();
  const results = {};
  for (const provider of providers) {
    const prior = previous.providers?.[provider.name];
    let retryAt = Math.max(prior?.caller?.retryAt ?? 0, prior?.specified?.retryAt ?? 0);
    const checks = {};
    for (const mode of provider.callerOnly ? ["caller"] : Object.keys(MODES)) {
      const last = prior?.[mode];
      checks[mode] = retryAt > now()
        ? { status: "skipped", retryAt, consecutiveFailures: last?.consecutiveFailures ?? 0 }
        : await probe(provider, mode, last, fetch, now);
      retryAt = checks[mode].retryAt ?? 0;
    }
    results[provider.name] = checks;
  }
  return { checkedAt, providers: results };
}

function formatCheck(check) {
  if (!check) return "—";
  switch (check.status) {
    case "ok": return `✓ ${check.latencyMs} ms`;
    case "error": return `✗ ${check.error}`;
    case "rate-limited": return "⏳ HTTP 429";
    case "skipped": return "Skipped";
  }
}

export function renderSummary(report) {
  const lines = [
    "## Provider monitor",
    "",
    `Checked at ${report.checkedAt} · Server-side checks`,
    "",
    "| Provider | Caller IP | Specified IP (8.8.8.8) | Notes |",
    "| --- | --- | --- | --- |",
  ];
  for (const [provider, checks] of Object.entries(report.providers)) {
    const notes = [];
    for (const [mode, check] of Object.entries(checks)) {
      if (check.status === "error" && check.consecutiveFailures > 1) {
        notes.push(`${MODES[mode]} failed ${check.consecutiveFailures} runs in a row`);
      }
      if (check.recovered) notes.push(`${MODES[mode]} recovered`);
    }
    const retryAt = Math.max(checks.caller.retryAt ?? 0, checks.specified?.retryAt ?? 0);
    if (retryAt) notes.push(`Retry after ${new Date(retryAt).toISOString()}`);
    lines.push(`| \`${provider}\` | ${formatCheck(checks.caller)} | ${formatCheck(checks.specified)} | ${notes.join(" · ")} |`);
  }
  return lines.join("\n") + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [output = "dist/status.json", previousFile] = process.argv.slice(2);
  const previous = previousFile ? JSON.parse(await readFile(previousFile, "utf8")) : {};
  const report = await monitorProviders(previous);
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(renderSummary(report));
}
