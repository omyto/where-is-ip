import assert from "node:assert/strict";
import { test } from "node:test";

const report = {
  checkedAt: "2026-11-17T00:00:00.000Z",
  probeIp: "1.1.1.1",
  providers: {
    "ip-info": {
      caller: { status: "error", error: "Lookup failed", consecutiveFailures: 2 },
      specified: {
        status: "error", error: "HTTP 503", consecutiveFailures: 1,
        response: { status: 503, contentType: "text/plain", body: "Service unavailable" },
      },
    },
    ipwhois: { caller: { status: "rate-limited" }, specified: { status: "skipped" } },
  },
};
const runUrl = "https://github.com/example/repo/actions/runs/123";

for (const state of ["open", "closed"]) {
  test(`publishes both failures together and only reuses an issue that is still ${state === "open" ? "open" : "not closed"}`, async () => {
    const { publishIssues } = await import("../scripts/provider-monitor-issues.mjs");
    const writes = [];
    const issue = { number: 42, state, body: "<!-- provider-monitor: ip-info -->" };
    const api = {
      async listOpenIssues() {
        return [
          { number: 41, state: "open", body: "<!-- provider-monitor: ipwhois -->" },
          { ...issue, state: "open" },
        ];
      },
      async getIssue(number) {
        assert.equal(number, 42);
        return issue;
      },
      async comment(number, body) { writes.push({ number, body }); return { html_url: "comment" }; },
      async create(title, body) { writes.push({ title, body }); return { html_url: "new-issue" }; },
    };

    await publishIssues(report, runUrl, api);

    assert.equal(writes.length, 1);
    assert.equal(writes[0].number, state === "open" ? 42 : undefined);
    assert.match(writes[0].body, /Caller IP/);
    assert.match(writes[0].body, /Specified IP/);
    assert.match(writes[0].body, /Specified IP \(1\.1\.1\.1\)/);
    assert.match(writes[0].body, /No HTTP response received/);
    assert.match(writes[0].body, /\nService unavailable\n/);
    assert.ok(writes[0].body.includes(runUrl));
    if (state === "closed") assert.match(writes[0].body, /<!-- provider-monitor: ip-info -->/);
  });
}

test("keeps large responses in the run artifact instead of exceeding the issue limit", async () => {
  const { publishIssues } = await import("../scripts/provider-monitor-issues.mjs");
  const largeReport = structuredClone(report);
  largeReport.providers["ip-info"].specified.response.body = "x".repeat(70_000);
  let written;
  await publishIssues(largeReport, runUrl, {
    async listOpenIssues() { return []; },
    async create(title, body) { written = body; return { html_url: "new-issue" }; },
  });
  assert.ok(written.length < 60_000);
  assert.match(written, /Full response in the run's `provider-monitor-status` artifact/);
});

test("includes the selected domain and resolved IP in failure reports", async () => {
  const { publishIssues } = await import("../scripts/provider-monitor-issues.mjs");
  const domainReport = { ...report, probeTarget: "google.com", probeIp: "192.0.2.10" };
  let written;
  await publishIssues(domainReport, runUrl, {
    async listOpenIssues() { return []; },
    async create(title, body) { written = body; return { html_url: "new-issue" }; },
  });
  assert.match(written, /Specified IP \(google\.com → 192\.0\.2\.10\)/);
});
