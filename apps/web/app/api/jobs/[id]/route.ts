import { getJob } from "../_handlers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getJob((await params).id, request);
}
