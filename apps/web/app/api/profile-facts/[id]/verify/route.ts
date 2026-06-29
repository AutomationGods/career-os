import { verifyProfileFact } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return verifyProfileFact((await params).id, request);
}
