import { Console } from "node:console";
import { resolve4 } from "node:dns/promises";
import { readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { providers } from "../src/providers/index.js";
import { ProviderRateLimitError } from "../src/providers/shared.js";

const PROBE_TARGETS = [
  "8.8.8.8", "208.67.222.222",
  "google.com", "github.com", "apple.com", "microsoft.com", "amazon.com", "facebook.com",
];
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MODES = { caller: "Caller IP", specified: "Specified IP" };
const COLUMNS = ["Provider", MODES.caller, MODES.specified, "Notes"];

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
    body = body.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, address => {
      return isIP(address) === 4 ? "[redacted]" : address;
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

async function probe(provider, mode, probeIp, previous, fetch, now) {
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
    const result = mode === "caller" ? await provider.lookup() : await provider.lookup(probeIp);
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

async function selectProbe(random, resolve) {
  const targets = [...PROBE_TARGETS];
  for (let index = targets.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [targets[index], targets[other]] = [targets[other], targets[index]];
  }

  for (const probeTarget of targets) {
    if (isIP(probeTarget)) return { probeTarget, probeIp: probeTarget };
    try {
      const [probeIp] = await resolve(probeTarget);
      if (probeIp) return { probeTarget, probeIp };
    } catch {
      // Try the next shuffled target when DNS resolution fails.
    }
  }
  throw new Error("No probe IP available");
}

export async function monitorProviders(previous = {}, fetch = globalThis.fetch, now = Date.now, random = Math.random, resolve = resolve4) {
  const checkedAt = new Date(now()).toISOString();
  const { probeTarget, probeIp } = await selectProbe(random, resolve);
  const results = {};
  for (const provider of providers) {
    const prior = previous.providers?.[provider.name];
    let retryAt = Math.max(prior?.caller?.retryAt ?? 0, prior?.specified?.retryAt ?? 0);
    const checks = {};
    for (const mode of provider.callerOnly ? ["caller"] : Object.keys(MODES)) {
      const last = prior?.[mode];
      checks[mode] = retryAt > now()
        ? { status: "skipped", retryAt, consecutiveFailures: last?.consecutiveFailures ?? 0 }
        : await probe(provider, mode, probeIp, last, fetch, now);
      retryAt = checks[mode].retryAt ?? 0;
    }
    results[provider.name] = checks;
  }
  return { checkedAt, probeTarget, probeIp, providers: results };
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

function reportRows(report) {
  return Object.entries(report.providers).map(([provider, checks]) => {
    const notes = [];
    for (const [mode, check] of Object.entries(checks)) {
      if (check.status === "error" && check.consecutiveFailures > 1) {
        notes.push(`${MODES[mode]} failed ${check.consecutiveFailures} runs in a row`);
      }
      if (check.recovered) notes.push(`${MODES[mode]} recovered`);
    }
    const retryAt = Math.max(checks.caller.retryAt ?? 0, checks.specified?.retryAt ?? 0);
    if (retryAt) {
      const retryDate = new Date(retryAt);
      notes.push(Number.isNaN(retryDate.getTime()) ? "Retry date out of range" : `Retry after ${retryDate.toISOString()}`);
    }
    return [provider, formatCheck(checks.caller), formatCheck(checks.specified), notes.join(" · ")];
  });
}

function reportCaption(report) {
  return `Checked at ${report.checkedAt}`;
}

function formatProbeTarget(report) {
  return report.probeTarget && report.probeTarget !== report.probeIp
    ? `${report.probeTarget} → ${report.probeIp}`
    : report.probeIp;
}

export function renderSummary(report) {
  const lines = [
    "## Provider monitor",
    "",
    reportCaption(report),
    "",
    `| ${COLUMNS.join(" | ")} |`,
    "| --- | --- | --- | --- |",
  ];
  for (const [provider, ...cells] of reportRows(report)) {
    lines.push(`| \`${provider}\` | ${cells.join(" | ")} |`);
  }
  lines.push("", `Specified IP checks used \`${formatProbeTarget(report)}\`.`);
  return lines.join("\n") + "\n";
}

export function printReport(report, stdout = process.stdout) {
  if (!stdout.isTTY) {
    stdout.write(renderSummary(report));
    return;
  }

  const terminal = new Console({ stdout, colorMode: false });
  terminal.log("Provider monitor");
  terminal.log(reportCaption(report));
  terminal.table(reportRows(report).map(cells =>
    Object.fromEntries(COLUMNS.map((column, index) => [column, cells[index]])),
  ));
  terminal.log(`Specified IP checks used ${formatProbeTarget(report)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [output = "dist/status.json", previousFile] = process.argv.slice(2);
  const previous = previousFile ? JSON.parse(await readFile(previousFile, "utf8")) : {};
  const report = await monitorProviders(previous);
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  printReport(report);
}
