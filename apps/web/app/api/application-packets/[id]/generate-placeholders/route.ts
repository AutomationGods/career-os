import { generateApplicationPacketPlaceholders } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return generateApplicationPacketPlaceholders((await params).id, request);
}
