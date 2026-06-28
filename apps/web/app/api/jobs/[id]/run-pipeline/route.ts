import { runJobPipeline } from "../../_handlers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return runJobPipeline(params.id, request);
}
