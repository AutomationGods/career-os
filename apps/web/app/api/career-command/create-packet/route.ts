import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({ opportunityId: z.string().optional(), workspaceId: z.string().default("default") });

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid packet creation request.", "INVALID_PACKET_CREATION_REQUEST", 400);
  const command = createCommand({ type: "career_opportunities.create_packet", requestedBy: "api", userId: authUser.userId, entityType: "career_opportunity", entityId: parsed.data.opportunityId ?? authUser.userId, payload: parsed.data });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}
