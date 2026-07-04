import { stateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { GET as readCareerCommandStatus } from "../status/route";
import { POST as uploadResume } from "../../source-documents/upload/route";

process.env.CAREER_OS_AUTH_DISABLED = "true";
process.env.CAREER_OS_AUTH_DISABLED_USER_ID = "failed-upload-user";
process.env.CAREER_OS_COMMAND_RUNTIME = "local-memory";

const userId = "failed-upload-user";
const resumeFilename = "2026 - Gregory Baskin - Resume - Updated.docx";

async function seedStaleCareerCommandState() {
  stateStore.clear();
  const userScope = { userId };

  await stateStore.upsertProjection({ userId, projectionType: "source_documents.current", entityType: "source_documents", entityId: userId, data: { documents: [{ id: "stale-doc", title: "Old resume", documentType: "resume" }], claims: [{ id: "stale-claim", claim: "Old claim", sourceDocumentId: "stale-doc" }] } });
  await stateStore.upsertProjection({ userId, projectionType: "career_claim.current", entityType: "career_claim", entityId: "stale-claim", data: { id: "stale-claim", claim: "Old claim", sourceDocumentId: "stale-doc" } });
  await stateStore.upsertProjection({ userId, projectionType: "profile_facts.current", entityType: "profile_fact", entityId: "stale-fact", data: { id: "stale-fact", claim: "Old fact" } });
  await stateStore.upsertProjection({ userId, projectionType: "career_profile.current", entityType: "career_profile", entityId: userId, data: { targetTitles: ["Stale Architect"], strongestSkills: ["Stale skill"], strongestTools: ["Stale tool"], suggestedJobSearchKeywords: ["stale keyword"] } });
  await stateStore.upsertProjection({ userId, projectionType: "career_opportunities.current_pipeline", entityType: "career_opportunities", entityId: userId, data: { opportunities: [{ id: "stale-job", title: "Stale Job" }], searchQueriesUsed: ["stale query"], cleanTargetTitlesUsed: ["Stale Architect"] } });
  await stateStore.upsertProjection({ userId, projectionType: "application_packet.current", entityType: "application_packet", entityId: "stale-packet", data: { id: "stale-packet", selectedJob: { title: "Stale Job" } } });
  await stateStore.upsertProjection({ userId, projectionType: "resume.current_draft", entityType: "resume", entityId: "stale-resume", data: { id: "stale-resume", title: "Stale resume draft" } });
  await stateStore.upsertProjection({ userId, projectionType: "daily_mission.current_queue", entityType: "daily_mission", entityId: "today", data: { highestLeverageNextAction: "Do stale work" } });

  expect(await stateStore.getProjection("source_documents", userId, "source_documents.current", userScope)).toBeTruthy();
  expect((await stateStore.listByProjectionType("career_claim.current", userScope))).toHaveLength(1);
  expect((await stateStore.listByProjectionType("profile_facts.current", userScope))).toHaveLength(1);
}

async function uploadBrokenDocx() {
  const formData = new FormData();
  formData.set("file", new File(["this is not a real docx archive"], resumeFilename, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  formData.set("title", "2026 Gregory Baskin Resume Updated");
  formData.set("documentType", "resume");

  return uploadResume(new Request("http://localhost/api/source-documents/upload", { method: "POST", body: formData }));
}

describe("Career Command failed resume upload state", () => {
  it("clears stale persisted data and reports the exact failed-upload empty snapshot", async () => {
    await seedStaleCareerCommandState();

    const uploadResponse = await uploadBrokenDocx();
    const uploadBody = await uploadResponse.json();

    expect(uploadResponse.status).toBe(400);
    expect(uploadBody.ok).toBe(false);
    expect(uploadBody.error.code).toBe("DOCX_RESUME_PARSE_FAILED");

    const userScope = { userId };
    expect(await stateStore.getProjection("source_documents", userId, "source_documents.current", userScope)).toBeUndefined();
    expect(await stateStore.getProjection("career_profile", userId, "career_profile.current", userScope)).toBeUndefined();
    expect(await stateStore.getProjection("career_opportunities", userId, "career_opportunities.current_pipeline", userScope)).toBeUndefined();
    expect(await stateStore.getProjection("daily_mission", "today", "daily_mission.current_queue", userScope)).toBeUndefined();
    expect(await stateStore.listByProjectionType("career_claim.current", userScope)).toHaveLength(0);
    expect(await stateStore.listByProjectionType("profile_facts.current", userScope)).toHaveLength(0);
    expect(await stateStore.listByProjectionType("application_packet.current", userScope)).toHaveLength(0);
    expect(await stateStore.listByProjectionType("resume.current_draft", userScope)).toHaveLength(0);

    const statusResponse = await readCareerCommandStatus(new Request("http://localhost/api/career-command/status"));
    const statusBody = await statusResponse.json();
    const snapshot = statusBody.data;

    expect(statusResponse.status).toBe(200);
    expect(snapshot.uiSnapshot.selectedUploadFile).toBe(resumeFilename);
    expect(snapshot.uiSnapshot.currentStatusMessage).toBe("Upload failed: Internal Server Error.");
    expect(snapshot.sourceDocuments.documents).toHaveLength(0);
    expect(snapshot.sourceDocuments.claims).toHaveLength(0);
    expect(snapshot.claims).toHaveLength(0);
    expect(snapshot.profileFacts).toHaveLength(0);
    expect(snapshot.careerProfile).toBeNull();
    expect(snapshot.opportunities.opportunities).toHaveLength(0);
    expect(snapshot.opportunities.searchQueriesUsed).toHaveLength(0);
    expect(snapshot.opportunities.cleanTargetTitlesUsed).toHaveLength(0);
    expect(snapshot.packets).toHaveLength(0);
    expect(snapshot.resumes).toHaveLength(0);
    expect(snapshot.mission).toBeNull();
  });
});
