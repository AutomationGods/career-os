import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { commandResult } from "../../../_lib/responses";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const command = createCommand({
    type: "jobs.run_pipeline",
    requestedBy: "api",
    userId: body.userId,
    entityType: "job",
    entityId: params.id,
    payload: {
      id: params.id,
      title: body.title ?? "Splunk Platform Engineer",
      company: body.company ?? "Seeded Company",
      location: body.location ?? "Remote",
      description: body.description ?? "Splunk Cribl Terraform AWS observability role",
      source: body.source ?? "api",
      employmentType: body.employmentType,
      requiredFields: body.requiredFields,
      hasEasyApply: body.hasEasyApply,
      userId: body.userId
    }
  });
  const result = await createDefaultCommandBus().execute(command);
  return commandResult(result);
}
