import { blockProfileFact } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return blockProfileFact((await params).id, request);
}
