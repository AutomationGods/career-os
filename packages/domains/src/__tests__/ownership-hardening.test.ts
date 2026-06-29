import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { InMemoryApplicationPacketStore, nextActionForStatus, type ApplicationPacketRecord } from "../application-packet/services";
import { InMemoryDocumentExportStore } from "../document-export/document-export-store";
import { InMemoryMasterResumeStore } from "../identity/master-resume-service";
import { InMemoryProfileFactsStore } from "../identity/profile-facts-service";
import { InMemoryJobStore, type SavePipelineResultInput } from "../job-discovery/job-store";
import { InMemoryResumeVersionStore } from "../resume-factory/resume-version-store";

const USER_A = "user-a";
const USER_B = "user-b";

function jobInput(userId = USER_A): SavePipelineResultInput {
  return {
    userId,
    input: {
      userId,
      title: "Platform Engineer",
      companyName: "ExampleCo",
      description: "Splunk and Cribl platform role",
      source: "manual"
    },
    normalizedJob: {
      title: "Platform Engineer",
      company: "ExampleCo",
      description: "Splunk and Cribl platform role",
      source: "manual",
      raw: {}
    },
    remoteClassification: "remote",
    clearanceSegment: null,
    certificationClassification: { required: [], preferred: [], blocked: [] },
    fitScore: 80,
    applicationDifficultyScore: 20,
    dashboardSegment: "Remote Commercial"
  };
}

function packet(userId = USER_A): ApplicationPacketRecord {
  const now = new Date().toISOString();
  return {
    id: "packet-a",
    userId,
    jobId: "job-a",
    selectedJob: { title: "Platform Engineer", company: "ExampleCo", source: "test", raw: {} },
    selectedCompany: { name: "ExampleCo" },
    fitScoreSummary: { score: 80, segment: "Remote Commercial", highlights: ["Splunk"] },
    notes: [],
    status: "ready_to_generate",
    nextAction: nextActionForStatus("ready_to_generate"),
    createdAt: now,
    updatedAt: now
  };
}

describe("user ownership hardening", () => {
  it("rejects cross-user persisted job reads and lists", () => {
    const store = new InMemoryJobStore();
    const saved = store.savePipelineResult(jobInput());

    expect(store.getById(saved.id, USER_B)).toBeUndefined();
    expect(store.list({ userId: USER_B }).length).toBe(0);
    expect(store.getById(saved.id, USER_A)?.id).toBe(saved.id);
  });

  it("rejects cross-user application packet reads and writes", () => {
    const store = new InMemoryApplicationPacketStore();
    store.create(packet());

    let rejected = false;
    try {
      store.updateStatus("packet-a", "submitted", undefined, USER_B);
    } catch {
      rejected = true;
    }

    expect(store.getById("packet-a", USER_B)).toBeUndefined();
    expect(store.list({ userId: USER_B }).length).toBe(0);
    expect(rejected).toBe(true);
  });

  it("rejects cross-user profile fact reads and writes", () => {
    const store = new InMemoryProfileFactsStore();
    const fact = store.create({ userId: USER_A, factType: "skill", label: "Splunk", sourceType: "manual" });

    expect(store.getById(fact.id, USER_B)).toBeUndefined();
    expect(store.update({ id: fact.id, userId: USER_B, label: "Cribl" })).toBeUndefined();
    expect(store.verify(fact.id, USER_B)).toBeUndefined();
    expect(store.getById(fact.id, USER_A)?.label).toBe("Splunk");
  });

  it("rejects cross-user master resume reads", () => {
    const store = new InMemoryMasterResumeStore();
    store.importResume({ userId: USER_A, resumeText: "Splunk engineer" });

    expect(store.getCurrent(USER_B)).toBeUndefined();
    expect(store.getCurrent(USER_A)?.userId).toBe(USER_A);
  });

  it("rejects cross-user resume version reads", () => {
    const store = new InMemoryResumeVersionStore();
    const saved = store.save({
      userId: USER_A,
      draft: {
        id: "resume-a",
        jobId: "job-a",
        companyId: "company-a",
        applicationPacketId: "packet-a",
        reviewRequired: true,
        templateKey: "ats" as never,
        templateName: "ATS",
        sectionOrder: [] as never,
        sections: [],
        content: "Resume",
        sourceFacts: [],
        targetKeywords: [],
        missingKeywords: [],
        matchedFactCount: 0,
        unmatchedFactCount: 0,
        reviewChecklist: [],
        warnings: []
      },
      templateKey: "ats" as never,
      sectionOrder: [] as never,
      reviewChecklist: []
    });

    expect(store.getById(saved.id, USER_B)).toBeUndefined();
    expect(store.getById(saved.id, USER_A)?.id).toBe(saved.id);
  });

  it("rejects cross-user document export reads and lists", () => {
    const store = new InMemoryDocumentExportStore();
    const saved = store.save({
      userId: USER_A,
      documentType: "resume",
      format: "markdown",
      filename: "resume.md",
      mimeType: "text/markdown",
      checksum: "abc123",
      byteLength: 6,
      textContent: "Resume",
      warningText: "Local export only.",
      sourceResumeDraftId: "resume-a"
    });

    expect(store.getById(saved.id, USER_B)).toBeUndefined();
    expect(store.list({ userId: USER_B }).length).toBe(0);
    expect(store.getById(saved.id, USER_A)?.id).toBe(saved.id);
  });

  it("rejects cross-user event reads and lists", () => {
    const store = new InMemoryEventStore();
    const saved = store.append({ userId: USER_A, eventType: "job.imported", entityType: "job", entityId: "job-a", domain: "job-discovery" });

    expect(store.getById(saved.id, USER_B)).toBeUndefined();
    expect(store.listByEntity("job", "job-a", USER_B).length).toBe(0);
    expect(store.listRecent(10, USER_B).length).toBe(0);
  });

  it("rejects cross-user state projection reads and lists", () => {
    const store = new InMemoryStateStore();
    store.upsertProjection({ userId: USER_A, projectionType: "job.current", entityType: "job", entityId: "job-a", data: { id: "job-a" } });

    expect(store.getProjection("job", "job-a", "job.current", USER_B)).toBeUndefined();
    expect(store.listByEntity("job", "job-a", USER_B).length).toBe(0);
    expect(store.listRecent(10, USER_B).length).toBe(0);
  });

  it("rejects cross-user snapshot reads and lists", () => {
    const store = new InMemorySnapshotStore();
    const saved = store.captureSnapshot({ userId: USER_A, entityType: "job", entityId: "job-a", snapshotType: "job.source", data: { id: "job-a" } });

    expect(store.getSnapshot(saved.id, USER_B)).toBeUndefined();
    expect(store.listByEntity("job", "job-a", USER_B).length).toBe(0);
    expect(store.listByUser(USER_B).length).toBe(0);
  });
});
