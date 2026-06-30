import { listApplicationPackets } from "@career-os/domains";
import { createCommand } from "@career-os/orchestration";
import { executeCommandForReview } from "../_lib/command-runtime";
import { commandResult } from "../_lib/responses";

export async function GET() {
  return Response.json({ ok: true, data: { applicationPackets: listApplicationPackets() } });
}

export async function POST(request: Request) {
  const body = await request.json();
  const command = createCommand({
    type: "application_packets.create",
    requestedBy: "api",
    userId: body.userId,
    entityType: "job",
    entityId: body.jobId,
    payload: body
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 201, 400);
}
