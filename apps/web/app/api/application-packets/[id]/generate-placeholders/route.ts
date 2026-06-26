import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { commandResult } from "../../../_lib/responses";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const command = createCommand({
    type: "application_packets.generate_placeholders",
    requestedBy: "api",
    entityType: "application_packet",
    entityId: params.id,
    payload: { id: params.id }
  });
  const result = await createDefaultCommandBus().execute(command);
  return commandResult(result, 200, 404);
}
