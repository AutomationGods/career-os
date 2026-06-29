import { getApplicationPacket } from "../_handlers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getApplicationPacket((await params).id, request);
}
