import { runJobPipeline } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return runJobPipeline((await params).id, request);
}
