import { updateApplicationPacketStatus } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return updateApplicationPacketStatus((await params).id, request);
}
