import { describe, expect, it } from "vitest";
import { cleanRemotiveHtml, clampRemotiveLimit, jobMatchesQuery, mapArbeitnowResponse, mapRemoteOkResponse, mapRemotiveResponse, normalizeRemotiveJob, REMOTIVE_SOURCE } from "../services";

const remotiveJob = {
  id: 123,
  url: "https://remotive.com/remote-jobs/devops/splunk-engineer-123",
  title: "Splunk DevOps Engineer",
  company_name: "ExampleCo",
  category: "Software Development",
  job_type: "full_time",
  publication_date: "2026-06-30T12:00:00",
  candidate_required_location: "Worldwide",
  salary: "$100k",
  description: "<p>Build <strong>Splunk</strong> and Cribl pipelines&nbsp;on AWS.</p><script>bad()</script>"
};

describe("Remotive job source", () => {
  it("maps Remotive records into attributed discovered jobs", () => {
    const job = normalizeRemotiveJob(remotiveJob);

    expect(job?.sourceJobId).toBe("123");
    expect(job?.jobId).toBe("remotive:123");
    expect(job?.title).toBe("Splunk DevOps Engineer");
    expect(job?.company).toBe("ExampleCo");
    expect(job?.location).toBe("Worldwide");
    expect(job?.url).toBe(remotiveJob.url);
    expect(job?.employmentType).toBe("full_time");
    expect(job?.source).toBe(REMOTIVE_SOURCE);
    expect(job?.description).toBe("Build Splunk and Cribl pipelines on AWS.");
  });

  it("clamps requested limits to the supported Remotive range", () => {
    expect(clampRemotiveLimit(0)).toBe(1);
    expect(clampRemotiveLimit(20)).toBe(20);
    expect(clampRemotiveLimit(500)).toBe(50);
    expect(clampRemotiveLimit("7")).toBe(7);
  });

  it("strips HTML descriptions enough for scoring text", () => {
    expect(cleanRemotiveHtml("<h1>Role</h1><p>AWS &amp; Terraform<br>remote</p>"))
      .toBe("Role AWS & Terraform remote");
  });

  it("throws on invalid Remotive responses", () => {
    let message = "";
    try {
      mapRemotiveResponse({ nope: [] });
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message.includes("expected a jobs array")).toBe(true);
  });

  it("drops malformed jobs and applies the requested limit", () => {
    const jobs = mapRemotiveResponse({ jobs: [remotiveJob, { id: 456 }, { ...remotiveJob, id: 789, title: "Second" }] }, 1);

    expect(jobs.length).toBe(1);
    expect(jobs[0]?.sourceJobId).toBe("123");
  });

  it("enforces keyword filtering locally after source responses", () => {
    const splunkJobs = mapRemotiveResponse({ jobs: [remotiveJob, { ...remotiveJob, id: 456, title: "Ruby Engineer", description: "Rails application role." }] }, 10, "splunk");

    expect(splunkJobs.length).toBe(1);
    expect(splunkJobs[0]?.sourceJobId).toBe("123");
    expect(jobMatchesQuery(splunkJobs[0]!, "aws remote")).toBe(true);
    expect(jobMatchesQuery(splunkJobs[0]!, "golang")).toBe(false);
  });

  it("maps Remote OK and Arbeitnow public API records", () => {
    const remoteOkJobs = mapRemoteOkResponse([{ id: 999, position: "AWS Terraform Engineer", company: "RemoteCo", url: "https://remoteok.com/remote-jobs/999", tags: ["devops"], description: "Terraform AWS role" }], 10, "terraform");
    const arbeitnowJobs = mapArbeitnowResponse({ data: [{ slug: "splunk-role", title: "Splunk Engineer", company_name: "BerlinCo", url: "https://www.arbeitnow.com/jobs/splunk-role", remote: true, description: "Splunk observability role" }] }, 10, "splunk");

    expect(remoteOkJobs[0]?.jobId).toBe("remoteok:999");
    expect(remoteOkJobs[0]?.source).toBe("Remote OK");
    expect(arbeitnowJobs[0]?.jobId).toBe("arbeitnow:splunk-role");
    expect(arbeitnowJobs[0]?.source).toBe("Arbeitnow");
  });
});
