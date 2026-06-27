import { updateProfileFact } from "../_handlers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return updateProfileFact(params.id, request);
}
