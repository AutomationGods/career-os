import { blockProfileFact } from "../../_handlers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return blockProfileFact(params.id, request);
}
