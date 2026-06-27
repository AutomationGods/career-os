import { verifyProfileFact } from "../../_handlers";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return verifyProfileFact(params.id);
}
