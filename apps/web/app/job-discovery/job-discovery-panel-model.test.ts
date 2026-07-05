import { describe, expect, it } from "vitest";
import { DEFAULT_JOB_DISCOVERY_QUERY, buildJobDiscoveryPayload, buildJobDiscoveryQueries, clampJobDiscoveryLimit, jobDiscoveryResultFromEnvelope } from "./job-discovery-panel-model";

describe("job discovery panel model", () => {
  it("builds default multi-source search payloads", () => {
    const payload = buildJobDiscoveryPayload({ query: "", limit: "" });

    expect(payload.query).toBe(DEFAULT_JOB_DISCOVERY_QUERY);
    expect(payload.limit).toBe(20);
    expect(payload.source).toBe("all");
  });

  it("trims queries, clamps limits, and preserves selected source", () => {
    const payload = buildJobDiscoveryPayload({ query: "  splunk aws  ", limit: "500", source: "remoteok" });

    expect(payload.query).toBe("splunk aws");
    expect(payload.limit).toBe(50);
    expect(payload.source).toBe("remoteok");
    expect(clampJobDiscoveryLimit(0)).toBe(1);
  });

  it("builds capped multi-title and keyword payloads", () => {
    const payload = buildJobDiscoveryPayload({
      query: "fallback",
      jobTitles: "Splunk Engineer\nCribl Engineer\nSplunk Engineer",
      keywords: "AWS, Terraform, SIEM, observability",
      limit: 10,
      source: "all"
    });
    const queries = buildJobDiscoveryQueries(payload.jobTitles, payload.keywords, payload.query);

    expect(payload.jobTitles).toEqual(["Splunk Engineer", "Cribl Engineer"]);
    expect(payload.keywords).toEqual(["AWS", "Terraform", "SIEM", "observability"]);
    expect(queries).toEqual([
      "Splunk Engineer AWS",
      "Splunk Engineer Terraform",
      "Splunk Engineer SIEM",
      "Splunk Engineer observability",
      "Cribl Engineer AWS",
      "Cribl Engineer Terraform"
    ]);
  });

  it("falls back to the single query when title and keyword inputs are blank", () => {
    expect(buildJobDiscoveryQueries("", "", "  splunk aws  ")).toEqual(["splunk aws"]);
  });

  it("parses successful command result envelopes", () => {
    const result = jobDiscoveryResultFromEnvelope({
      ok: true,
      data: {
        commandId: "command-1",
        status: "completed",
        result: {
          runId: "run-1",
          source: "remotive",
          query: "splunk",
          imported: 1,
          queries: ["Splunk Engineer AWS", "Cribl Engineer SIEM"],
          jobs: [
            {
              sourceJobId: "123",
              jobId: "remotive:123",
              title: "Splunk Engineer",
              company: "ExampleCo",
              url: "https://remotive.com/remote-jobs/devops/splunk-engineer-123",
              source: "Remotive",
              fitScore: 80,
              dashboardSegment: "Remote Commercial"
            }
          ]
        }
      }
    });

    expect(result.commandId).toBe("command-1");
    expect(result.runId).toBe("run-1");
    expect(result.imported).toBe(1);
    expect(result.queries).toEqual(["Splunk Engineer AWS", "Cribl Engineer SIEM"]);
    expect(result.jobs[0]?.jobId).toBe("remotive:123");
  });

  it("parses error envelopes", () => {
    const result = jobDiscoveryResultFromEnvelope({ ok: false, error: { code: "NOPE", message: "Failed" } });

    expect(result.errorCode).toBe("NOPE");
    expect(result.errorMessage).toBe("Failed");
  });
});
