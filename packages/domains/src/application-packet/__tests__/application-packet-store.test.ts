import { describe, expect, it } from "vitest";
import { InMemoryApplicationPacketStore, nextActionForStatus, type ApplicationPacketRecord } from "../services";

function packet(overrides: Partial<ApplicationPacketRecord> = {}): ApplicationPacketRecord {
  const now = new Date().toISOString();
  return {
    id: "packet-1",
    userId: "user-1",
    jobId: "job-1",
    companyId: "company-1",
    selectedJob: { title: "Splunk Engineer", company: "ExampleCo", source: "test", raw: {} },
    selectedCompany: { id: "company-1", name: "ExampleCo" },
    fitScoreSummary: { score: 82, segment: "Remote Commercial", highlights: ["Splunk", "Cribl"] },
    notes: [],
    status: "ready_to_generate",
    nextAction: nextActionForStatus("ready_to_generate"),
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("InMemoryApplicationPacketStore", () => {
  it("creates, gets, and lists packets", () => {
    const store = new InMemoryApplicationPacketStore();
    const saved = store.create(packet());

    expect(saved.id).toBe("packet-1");
    expect(store.getById("packet-1")?.selectedJob.title).toBe("Splunk Engineer");
    expect(store.list({ userId: "user-1" }).length).toBe(1);
    expect(store.list({ status: "ready_to_generate" })[0]?.id).toBe("packet-1");
  });

  it("updates generated draft fields and status", () => {
    const store = new InMemoryApplicationPacketStore();
    store.create(packet());

    const generated = store.updateDraftFields("packet-1", {
      resumePlaceholder: "Resume brief",
      coverLetterPlaceholder: "Cover letter",
      recruiterMessagePlaceholder: "Recruiter message",
      status: "awaiting_review",
      nextAction: nextActionForStatus("awaiting_review")
    });
    const submitted = store.updateStatus("packet-1", "submitted");

    expect(generated.resumePlaceholder).toBe("Resume brief");
    expect(generated.status).toBe("awaiting_review");
    expect(submitted.status).toBe("submitted");
    expect(submitted.nextAction).toBe(nextActionForStatus("submitted"));
  });
});
