import { readFeatureFlags } from "@career-os/config";
import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { fail } from "../_lib/responses";
import { requireUser, sessionErrorResponse } from "../_lib/session";

function packetsFromResult(data: unknown) {
  if (!data || typeof data !== "object" || !Array.isArray((data as { applicationPackets?: unknown }).applicationPackets)) return [];
  return (data as { applicationPackets: Array<{ status?: unknown }> }).applicationPackets;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS) return fail("Not found.", "NOT_FOUND", 404);
    const result = await createDefaultCommandBus().execute(createCommand({
      type: "application_packets.list",
      requestedBy: "api",
      userId: user.id,
      entityType: "application_packet",
      entityId: "daily-mission-packets",
      payload: { userId: user.id }
    }));
    const packets = result.ok ? packetsFromResult(result.data) : [];
    return Response.json({
      topRemoteCommercialJobs: [],
      hybridCommercialJobs: [],
      onsiteCommercialJobs: [],
      clearanceGovernmentSeparatedJobs: [],
      lowFitJobs: [],
      jobsReadyForPacketGeneration: [],
      packetsAwaitingReview: packets.filter((packet) => packet.status === "awaiting_review"),
      followupsDuePlaceholder: [],
      estimatedApplyTimePlaceholder: "TBD after application difficulty scoring"
    });
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail("Could not load daily mission.", "DAILY_MISSION_FAILED", 500);
    }
  }
}
