import type { ApplicationPacketRecord } from "@career-os/domains";
import { describe, expect, it } from "vitest";
import { buildPacketResumePayload, parseVerifiedFacts } from "../packet-resume-action-model";

const packet: ApplicationPacketRecord = {
  id: "packet-1",
  jobId: "job-1",
  selectedJob: {
    title: "Splunk Terraform Engineer",
    company: "ExampleCo",
    description: "Splunk Cribl Terraform AWS observability role.",
    source: "test",
    raw: {}
  },
  selectedCompany: { name: "ExampleCo" },
  fitScoreSummary: { score: 88, segment: "Remote Commercial", highlights: ["Matched: Splunk, Cribl", "Application difficulty: 25"] },
  notes: [],
  status: "ready_to_generate",
  nextAction: "Generate resume",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString()
};

describe("packet resume action model", () => {
  it("parses verified fact text into unique facts", () => {
    expect(JSON.stringify(parseVerifiedFacts("- Built Splunk dashboards\n- Built Splunk dashboards\n• Managed Terraform modules"))).toBe(JSON.stringify([
      "Built Splunk dashboards",
      "Managed Terraform modules"
    ]));
  });

  it("builds a packet-specific resume payload without injecting manual facts", () => {
    const payload = buildPacketResumePayload(packet, "Built Splunk dashboards\nManaged Terraform modules");

    expect(payload.applicationPacketId).toBe("packet-1");
    expect(payload.jobId).toBe("job-1");
    expect(payload.companyName).toBe("ExampleCo");
    expect(payload.targetRole).toBe("Splunk Terraform Engineer");
    expect(JSON.stringify(payload.verifiedFacts)).toBe(JSON.stringify([]));
    expect(payload.targetKeywords.includes("Splunk Terraform Engineer")).toBe(true);
  });
});
