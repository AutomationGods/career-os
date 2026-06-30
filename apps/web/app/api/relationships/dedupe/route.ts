import { createCommand } from "@career-os/orchestration";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult } from "../../_lib/responses";

export async function POST(request: Request) {
  const body = await request.json();
  const command = createCommand({
    type: "relationships.dedupe",
    requestedBy: "api",
    userId: Array.isArray(body) ? undefined : body.userId,
    entityType: "person",
    payload: Array.isArray(body) ? body : { people: body.people ?? [] }
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}
