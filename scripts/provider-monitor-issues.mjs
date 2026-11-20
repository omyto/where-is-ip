import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const LABEL = "provider-monitor";
const MODES = { caller: "Caller IP", specified: "Specified IP" };

function formatResponse(response) {
  if (!response) return "No HTTP response received.";
  const contentType = response.contentType?.split(";", 1)[0].trim();
  const lines = [`HTTP status: ${response.status}`];
  if (contentType && /^[\w.+-]+\/[\w.+-]+$/.test(contentType)) lines.push(`Content-Type: ${contentType}`);
  if (response.truncated) {
    lines.push("Response body omitted because it exceeded 1 MiB.");
  } else if (response.body === undefined) {
    lines.push("Response body could not be read.");
  } else if (!response.body) {
    lines.push("Response body is empty.");
  } else if (response.body.length > 25_000) {
    lines.push("Full response in the run's `provider-monitor-status` artifact.");
  } else {
    const longestFence = Math.max(0, ...Array.from(response.body.matchAll(/`+/g), match => match[0].length));
    if (longestFence >= 128) {
      lines.push("Full response in the run's `provider-monitor-status` artifact.");
    } else {
      const fence = "`".repeat(Math.max(3, longestFence + 1));
      lines.push("", "Response body:", "", fence, response.body, fence);
    }
  }
  return lines.join("\n");
}

export async function publishIssues(report, runUrl, api) {
  const failures = Object.entries(report.providers).flatMap(([provider, checks]) => {
    const failed = Object.entries(checks).filter(([, check]) => check.status === "error");
    return failed.length ? [[provider, failed]] : [];
  });
  if (!failures.length) return [];

  const probeTarget = report.probeTarget && report.probeTarget !== report.probeIp
    ? `${report.probeTarget} → ${report.probeIp}`
    : report.probeIp;
  const openIssues = await api.listOpenIssues();
  const links = [];
  for (const [provider, failed] of failures) {
    const marker = `<!-- provider-monitor: ${provider} -->`;
    const candidate = openIssues.find(issue => !issue.pull_request && issue.body?.includes(marker));
    const current = candidate && await api.getIssue(candidate.number);
    const sections = failed.map(([mode, check]) => [
      `### ${MODES[mode]}${mode === "specified" ? ` (${probeTarget})` : ""}`,
      "",
      `${check.error} · ${check.consecutiveFailures} consecutive failure(s)`,
      "",
      formatResponse(check.response),
    ].join("\n"));
    const body = [`Provider: \`${provider}\``, `Checked at: ${report.checkedAt}`, ...sections, `[View workflow run](${runUrl})`].join("\n\n");
    const target = current?.state === "open" && current.body?.includes(marker)
      ? await api.comment(current.number, body)
      : await api.create(`Provider monitor: ${provider} lookup failed`, `${marker}\n\n${body}`);
    links.push({ provider, url: target.html_url });
  }
  return links;
}

function githubApi(repository) {
  const path = `repos/${repository}`;
  function request(args, input) {
    return JSON.parse(execFileSync("gh", ["api", ...args], {
      encoding: "utf8",
      input: input && JSON.stringify(input),
      stdio: ["pipe", "pipe", "inherit"],
    }));
  }

  function list(endpoint) {
    return request(["--paginate", "--slurp", endpoint]).flat();
  }

  function post(endpoint, payload) {
    return request(["--method", "POST", endpoint, "--input", "-"], payload);
  }

  let labelReady = false;
  return {
    listOpenIssues: () => list(`${path}/issues?state=open&labels=${LABEL}&per_page=100`),
    getIssue: number => request([`${path}/issues/${number}`]),
    comment: (number, body) => post(`${path}/issues/${number}/comments`, { body }),
    create(title, body) {
      if (!labelReady) {
        const labels = list(`${path}/labels?per_page=100`);
        if (!labels.some(label => label.name === LABEL)) {
          post(`${path}/labels`, { name: LABEL, color: "B60205", description: "Provider monitor reports" });
        }
        labelReady = true;
      }
      return post(`${path}/issues`, { title, body, labels: [LABEL] });
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL } = process.env;
  const report = JSON.parse(await readFile(process.argv[2], "utf8"));
  const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  const links = await publishIssues(report, runUrl, githubApi(GITHUB_REPOSITORY));
  if (links.length) {
    process.stdout.write("\n### Issues updated\n\n");
    for (const { provider, url } of links) process.stdout.write(`- [${provider}](${url})\n`);
  }
}
