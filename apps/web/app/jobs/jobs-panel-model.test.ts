import { describe, expect, it } from "vitest";
import { buildResumePayloadDefaultsFromJob, buildSafeDemoJobPayload, groupJobsByDashboardSegment, jobsFromListEnvelope } from "./jobs-panel-model";

describe("jobs panel model", () => {
  it("builds a manual-only demo payload", () => {
    const payload = buildSafeDemoJobPayload();

    expect(payload.userId).toBe("demo-user");
    expect(payload.source).toBe("manual");
    expect(payload.description.includes("No external fetching")).toBe(true);
  });

  it("normalizes list envelopes and groups jobs by segment", () => {
    const jobs = jobsFromListEnvelope({
      ok: true,
      data: {
        result: {
          jobs: [
            { id: "job-1", title: "Remote SRE", company: { id: "company-1", name: "ExampleCo" }, sources: [], segments: [{ segment: "Remote Commercial" }], fitScores: [{ score: 80 }], difficultyScores: [{ score: 20 }] },
            { id: "job-2", title: "Gov SRE", sources: [], segments: [{ segment: "Clearance / Government" }], fitScores: [], difficultyScores: [] }
          ]
        }
      }
    });
    const groups = groupJobsByDashboardSegment(jobs);

    expect(jobs.length).toBe(2);
    expect(groups["Remote Commercial"][0]?.id).toBe("job-1");
    expect(groups["Clearance / Government"][0]?.id).toBe("job-2");
  });

  it("builds resume payload defaults from a persisted job", () => {
    const payload = buildResumePayloadDefaultsFromJob({
      id: "job-1",
      userId: "user-1",
      companyId: "company-1",
      title: "Splunk Platform Engineer",
      company: { id: "company-1", name: "ExampleCo" },
      description: "Splunk Cribl Terraform",
      sources: [],
      segments: [],
      fitScores: [],
      difficultyScores: []
    });

    expect(payload.jobId).toBe("job-1");
    expect(payload.companyId).toBe("company-1");
    expect(payload.applicationPacketId).toBe("packet_job-1");
    expect(payload.targetRole).toBe("Splunk Platform Engineer");
  });
});
