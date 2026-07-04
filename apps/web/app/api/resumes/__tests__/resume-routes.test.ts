import { describe, expect, it } from "vitest";
import { POST } from "../route";
import { resumeGenerateRequestSchema } from "../schema";

process.env.CAREER_OS_AUTH_DISABLED = "true";
process.env.CAREER_OS_AUTH_DISABLED_USER_ID = "user-1";
process.env.CAREER_OS_COMMAND_RUNTIME = "local-memory";

describe("resume route schema", () => {
  it("accepts safe resume generation requests", () => {
    const parsed = resumeGenerateRequestSchema.safeParse({
      userId: "user-1",
      jobId: "job-1",
      companyId: "company-1",
      applicationPacketId: "packet-1",
      targetRole: "Splunk Terraform Engineer",
      verifiedFacts: ["Built Terraform modules for AWS observability workloads."]
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts requests without payload verified facts because profile_facts.current is the source of truth", () => {
    const parsed = resumeGenerateRequestSchema.safeParse({
      jobId: "job-1",
      companyId: "company-1",
      applicationPacketId: "packet-1"
    });

    expect(parsed.success).toBe(true);
    expect(JSON.stringify(parsed.data?.verifiedFacts)).toBe(JSON.stringify([]));
  });

  it("returns the expected failure envelope for invalid API payloads", async () => {
    const response = await POST(new Request("http://localhost/api/resumes", {
      method: "POST",
      body: JSON.stringify({ jobId: "job-1", applicationPacketId: "packet-1" })
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_RESUME_REQUEST");
    expect(body.error.message).toBe("Invalid resume generation request.");
  });

  it("generates the local Splunk/Cribl demo resume without requiring Prisma", async () => {
    const response = await POST(new Request("http://localhost/api/resumes", {
      method: "POST",
      body: JSON.stringify({
        jobId: "job-demo-splunk-cribl",
        companyId: "company-demo-commercial",
        applicationPacketId: "packet-demo-splunk-cribl",
        resumeVersionId: "resume-version-demo-splunk-cribl",
        targetRole: "Splunk / Cribl Platform Engineer",
        companyName: "Demo Commercial Company",
        jobDescription: "Splunk Cribl Terraform AWS Azure GCP observability role. CISSP and Security+ preferred. No clearance required.",
        verifiedFacts: [
          "Built Splunk SIEM dashboards and saved searches for security monitoring.",
          "Implemented Cribl pipelines for routing, filtering, and normalizing observability data.",
          "Performed log onboarding for Linux, AWS, Azure, and GCP sources into security data pipelines.",
          "Managed Terraform modules for cloud observability infrastructure."
        ],
        targetKeywords: ["Splunk", "Cribl", "SIEM", "Terraform", "AWS", "Azure", "GCP", "CISSP", "Security+", "clearance"]
      })
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    expect(Boolean(body.data.result.draft.id)).toBe(true);
    expect(body.data.result.guard.ok).toBe(true);
    expect(body.data.result.reviewRequired).toBe(true);
    expect(body.data.result.draft.resumeVersionId).toBe("resume-version-demo-splunk-cribl");
  });
});
