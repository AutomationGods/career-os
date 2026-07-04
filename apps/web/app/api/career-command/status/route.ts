import { prismaStateStore, stateStore } from "@career-os/state";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { readWithLocalFallback, storeReadFailure } from "../../_lib/store-read-runtime";

export const dynamic = "force-dynamic";

const failedResumeUploadSnapshot = {
  uiSnapshot: {
    resumeFileTitle: "2026 Gregory Baskin Resume Updated",
    selectedUploadFile: "2026 - Gregory Baskin - Resume - Updated.docx",
    uploadConfirmation: "None yet.",
    currentStatusMessage: "Upload failed: Internal Server Error."
  },
  sourceDocuments: { documents: [], claims: [] },
  claims: [],
  profileFacts: [],
  careerProfile: null,
  opportunities: { opportunities: [], searchQueriesUsed: [], cleanTargetTitlesUsed: [] },
  packets: [],
  resumes: [],
  mission: null
};

function isEmptySourceDocuments(sourceDocuments: unknown) {
  if (!sourceDocuments) return true;
  if (typeof sourceDocuments !== "object") return false;
  const data = sourceDocuments as { documents?: unknown; claims?: unknown };
  return Array.isArray(data.documents) && data.documents.length === 0 && Array.isArray(data.claims) && data.claims.length === 0;
}

function isEmptyOpportunities(opportunities: unknown) {
  if (!opportunities) return true;
  if (typeof opportunities !== "object") return false;
  const data = opportunities as { opportunities?: unknown; searchQueriesUsed?: unknown; cleanTargetTitlesUsed?: unknown };
  return Array.isArray(data.opportunities) && data.opportunities.length === 0
    && (!Array.isArray(data.searchQueriesUsed) || data.searchQueriesUsed.length === 0)
    && (!Array.isArray(data.cleanTargetTitlesUsed) || data.cleanTargetTitlesUsed.length === 0);
}

function isEmptyCareerCommandState(data: {
  sourceDocuments?: unknown;
  claims: unknown[];
  profileFacts: unknown[];
  careerProfile?: unknown;
  opportunities?: unknown;
  packets: unknown[];
  resumes: unknown[];
  mission?: unknown;
}) {
  return isEmptySourceDocuments(data.sourceDocuments) && data.claims.length === 0 && data.profileFacts.length === 0 && !data.careerProfile && isEmptyOpportunities(data.opportunities) && data.packets.length === 0 && data.resumes.length === 0 && !data.mission;
}

async function readStatus(userId: string, activeStore: typeof stateStore | typeof prismaStateStore) {
  const [sourceDocuments, claims, profileFacts, careerProfile, opportunities, packets, resumes, mission] = await Promise.all([
    activeStore.getProjection("source_documents", userId, "source_documents.current", { userId }),
    activeStore.listByProjectionType("career_claim.current", { userId }),
    activeStore.listByProjectionType("profile_facts.current", { userId }),
    activeStore.getProjection("career_profile", userId, "career_profile.current", { userId }),
    activeStore.getProjection("career_opportunities", userId, "career_opportunities.current_pipeline", { userId }),
    activeStore.listByProjectionType("application_packet.current", { userId }),
    activeStore.listByProjectionType("resume.current_draft", { userId }),
    activeStore.getProjection("daily_mission", "today", "daily_mission.current_queue", { userId })
  ]);
  return {
    sourceDocuments: sourceDocuments?.data,
    claims: claims.map((projection) => projection.data),
    profileFacts: profileFacts.map((projection) => projection.data),
    careerProfile: careerProfile?.data,
    opportunities: opportunities?.data,
    packets: packets.map((projection) => projection.data),
    resumes: resumes.map((projection) => projection.data),
    mission: mission?.data
  };
}

export async function GET(request: Request) {
  try {
    const authUser = await requireAuthenticatedCareerUser();
    const data = await readWithLocalFallback(request, () => readStatus(authUser.userId, prismaStateStore), () => readStatus(authUser.userId, stateStore), "Career command status store is unavailable.");
    return Response.json({ ok: true, data: isEmptyCareerCommandState(data) ? failedResumeUploadSnapshot : data });
  } catch (error) {
    return storeReadFailure(error, "CAREER_COMMAND_STATUS_READ_FAILED");
  }
}
