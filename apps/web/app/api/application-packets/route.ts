import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { executeCommandForReview } from "../_lib/command-runtime";
import { listPersistentApplicationPackets } from "../_lib/persistent-state";
import { commandResult, fail } from "../_lib/responses";

const createPacketSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  companyId: z.string().optional(),
  personId: z.string().optional(),
  selectedJob: z.record(z.unknown()).optional(),
  selectedCompany: z.record(z.unknown()).optional(),
  fitScoreSummary: z.record(z.unknown()).optional(),
  notes: z.array(z.string()).optional(),
});

export async function GET() {
  const authUser = await requireAuthenticatedCareerUser();
  const applicationPackets = await listPersistentApplicationPackets(authUser.userId);
  return Response.json({ ok: true, data: { applicationPackets } });
}

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = createPacketSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid application packet request.", "INVALID_PACKET_REQUEST", 400);

  const { ...payload } = parsed.data;
  const command = createCommand({
    type: "application_packets.create",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "job",
    entityId: payload.jobId,
    payload,
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 201, 400);
}
