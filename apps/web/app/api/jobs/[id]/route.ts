import { getJob } from "../_handlers";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return getJob(params.id);
}
