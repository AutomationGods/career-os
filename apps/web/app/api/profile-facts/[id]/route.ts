import { updateProfileFact } from "../_handlers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return updateProfileFact((await params).id, request);
}
