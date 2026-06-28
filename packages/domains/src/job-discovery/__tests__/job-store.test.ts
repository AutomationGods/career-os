import { describe, expect, it } from "vitest";
import { InMemoryJobStore, createDeterministicJobId } from "../job-store";

const pipelineSaveInput = {
  jobId: "job-fixed",
  userId: "user-1",
  sourceSnapshotId: "snapshot-source-1",
  input: {
    userId: "user-1",
    title: "Splunk Platform Engineer",
    companyName: "Example Co",
    location: "Remote",
    description: "Splunk Cribl Terraform AWS observability",
    url: "https://example.test/job",
    source: "manual",
    requiredFields: ["name", "email"],
    hasEasyApply: true
  },
  normalizedJob: {
    title: "Splunk Platform Engineer",
    company: "Example Co",
    location: "Remote",
    description: "Splunk Cribl Terraform AWS observability",
    url: "https://example.test/job",
    employmentType: "Full-time",
    source: "manual",
    raw: {}
  },
  remoteClassification: "remote",
  clearanceSegment: null,
  certificationClassification: { required: [], preferred: [], blocked: [] },
  fitScore: 42,
  applicationDifficultyScore: 15,
  dashboardSegment: "Remote Commercial" as const
};

describe("InMemoryJobStore", () => {
  it("creates deterministic manual job ids from URL evidence", () => {
    const first = createDeterministicJobId({ title: "SRE", companyName: "Example Co", location: "Remote", url: "https://example.test/jobs/1" });
    const second = createDeterministicJobId({ title: "Different", companyName: "Other", location: "Onsite", url: "https://example.test/jobs/1" });

    expect(first).toBe(second);
    expect(/^job_[a-f0-9]{16}$/.test(first)).toBe(true);
  });

  it("saves, lists, and gets persisted job records with analysis children", () => {
    const store = new InMemoryJobStore();
    const saved = store.savePipelineResult(pipelineSaveInput);

    expect(saved.id).toBe("job-fixed");
    expect(saved.company?.name).toBe("Example Co");
    expect(saved.sources[0]?.url).toBe("https://example.test/job");
    expect(saved.latestSnapshot?.id.startsWith("job_snapshot_")).toBe(true);
    expect(saved.segments[0]?.segment).toBe("Remote Commercial");
    expect(saved.fitScores[0]?.score).toBe(42);
    expect(saved.difficultyScores[0]?.score).toBe(15);
    expect(saved.latestPipelineResult?.sourceSnapshotId).toBe("snapshot-source-1");
    expect(store.getById("job-fixed")?.skills.map((skill) => skill.skill).includes("splunk")).toBe(true);
    expect(store.list({ userId: "user-1", segment: "Remote Commercial" }).length).toBe(1);
  });
});
