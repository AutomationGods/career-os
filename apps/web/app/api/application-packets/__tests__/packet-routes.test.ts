import { eventStore } from "@career-os/events";
import { snapshotStore } from "@career-os/snapshots";
import { stateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { POST as createPacket } from "../route";
import { GET as exportResume } from "../[id]/resume/export/route";
import { POST as updateStatus } from "../[id]/status/route";
import { POST as generateResume } from "../../resumes/route";

process.env.CAREER_OS_AUTH_DISABLED = "true";
process.env.CAREER_OS_AUTH_DISABLED_USER_ID = "user-1";
process.env.CAREER_OS_COMMAND_RUNTIME = "local-memory";

async function createApplicationPacket() {
  const response = await createPacket(new Request("http://localhost/api/application-packets", {
    method: "POST",
    body: JSON.stringify({
      jobId: "job-route-1",
      selectedJob: { title: "Splunk Terraform Engineer", company: "ExampleCo", description: "Splunk Cribl Terraform AWS observability role.", source: "test", raw: {} },
      selectedCompany: { name: "ExampleCo" },
      fitScoreSummary: { score: 88, segment: "Remote Commercial", highlights: ["Matched: Splunk, Cribl"] }
    })
  }));
  const body = await response.json();
  return body.data.result as { id: string; jobId: string; selectedCompany: { name: string } };
}

function clearStores() {
  eventStore.clear();
  stateStore.clear();
  snapshotStore.clear();
}

describe("application packet routes", () => {
  it("updates packet status through the manual status route", async () => {
    clearStores();
    const packet = await createApplicationPacket();

    const response = await updateStatus(new Request(`http://localhost/api/application-packets/${packet.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "awaiting_review", note: "Ready for human review." })
    }), { params: { id: packet.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.result.status).toBe("awaiting_review");
    expect(body.data.result.notes.includes("Ready for human review.")).toBe(true);
  });

  it("exports the packet resume as local markdown and records metadata", async () => {
    clearStores();
    const packet = await createApplicationPacket();
    await generateResume(new Request("http://localhost/api/resumes", {
      method: "POST",
      body: JSON.stringify({
        jobId: packet.jobId,
        companyId: packet.selectedCompany.name,
        applicationPacketId: packet.id,
        targetRole: "Splunk Terraform Engineer",
        companyName: "ExampleCo",
        jobDescription: "Splunk Cribl Terraform AWS observability role.",
        verifiedFacts: ["Built Splunk dashboards for observability.", "Managed Terraform modules for AWS infrastructure."],
        targetKeywords: ["Splunk", "Terraform", "AWS"]
      })
    }));

    const response = await exportResume(new Request(`http://localhost/api/application-packets/${packet.id}/resume/export`), { params: { id: packet.id } });
    const markdown = await response.text();
    const exportProjection = stateStore.getProjection("application_packet", packet.id, "document.local_export", { userId: "user-1" });
    const emittedTypes = eventStore.listByEntity("application_packet", packet.id).map((event) => event.eventType);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")?.includes("text/markdown")).toBe(true);
    expect(response.headers.get("content-disposition")?.includes(".md")).toBe(true);
    expect(markdown.includes("# Splunk Terraform Engineer")).toBe(true);
    expect(markdown.includes("Export mode: local markdown download only")).toBe(true);
    expect(Boolean(exportProjection)).toBe(true);
    expect(emittedTypes.includes("document.local_exported")).toBe(true);
    expect(emittedTypes.includes("application.submitted")).toBe(false);
    expect(emittedTypes.includes("file.uploaded")).toBe(false);
  });
});
