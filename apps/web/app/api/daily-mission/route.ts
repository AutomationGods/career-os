import { listApplicationPackets } from "@career-os/domains";
import { stateStore } from "@career-os/state";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function projectionData(projection: { data: unknown }) {
  return isRecord(projection.data) ? projection.data : {};
}

function bySegment(projections: Array<{ data: unknown }>, segment: string) {
  return projections.map(projectionData).filter((data) => data.dashboardSegment === segment);
}

export async function GET() {
  const packets = listApplicationPackets();
  const jobProjections = await Promise.resolve(stateStore.listByProjectionType("job.dashboard_segment"));

  return Response.json({
    topRemoteCommercialJobs: bySegment(jobProjections, "Remote Commercial"),
    hybridCommercialJobs: bySegment(jobProjections, "Hybrid Commercial"),
    onsiteCommercialJobs: bySegment(jobProjections, "Onsite Commercial"),
    clearanceGovernmentSeparatedJobs: bySegment(jobProjections, "Clearance / Government"),
    lowFitJobs: bySegment(jobProjections, "Low Fit"),
    jobsReadyForPacketGeneration: bySegment(jobProjections, "Remote Commercial"),
    packetsAwaitingReview: packets.filter((packet) => packet.status === "awaiting_review"),
    followupsDuePlaceholder: [],
    estimatedApplyTimePlaceholder: jobProjections.length > 0 ? "Estimated from application difficulty projections" : "TBD after application difficulty scoring"
  });
}
