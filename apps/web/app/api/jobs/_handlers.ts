import { createCommand, createDefaultCommandBus, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";

export const manualJobImportSchema = z.object({
  userId: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  title: z.string().min(1),
  companyName: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  description: z.string().min(1),
  employmentType: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  certifications: z.array(z.string().min(1)).optional().default([]),
  requiredFields: z.array(z.string().min(1)).optional().default([]),
  hasEasyApply: z.boolean().optional()
}).superRefine((value, context) => {
  if (!value.companyName && !value.company) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: "companyName or company is required" });
  }
});

export const jobListQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  segment: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export const jobGetSchema = z.object({
  id: z.string().min(1)
});

const runPipelineBodySchema = z.object({
  userId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  employmentType: z.string().min(1).optional(),
  certifications: z.array(z.string().min(1)).optional(),
  requiredFields: z.array(z.string().min(1)).optional(),
  hasEasyApply: z.boolean().optional()
}).passthrough();

async function jsonBody(request: Request) {
  return request.json().catch(() => ({}));
}

function defaultBus(bus?: CommandBus) {
  return bus ?? createDefaultCommandBus();
}

export async function importManualJob(request: Request, bus?: CommandBus) {
  const parsed = manualJobImportSchema.safeParse(await jsonBody(request));
  if (!parsed.success) return fail("Invalid manual job import payload.", "INVALID_JOB_IMPORT", 400);
  const body = parsed.data;
  const command = createCommand({
    type: "jobs.import_manual_url",
    requestedBy: "api",
    userId: body.userId,
    entityType: "job",
    payload: { ...body, companyName: body.companyName ?? body.company, source: body.source ?? "manual" }
  });
  const result = await defaultBus(bus).execute(command);
  return commandResult(result, 201, 400);
}

export async function listJobs(request: Request, bus?: CommandBus) {
  const url = new URL(request.url);
  const parsed = jobListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return fail("Invalid job list query.", "INVALID_JOB_LIST_QUERY", 400);
  const command = createCommand({
    type: "jobs.list",
    requestedBy: "api",
    userId: parsed.data.userId,
    entityType: "job",
    payload: parsed.data
  });
  const result = await defaultBus(bus).execute(command);
  return commandResult(result);
}

export async function getJob(id: string, bus?: CommandBus) {
  const parsed = jobGetSchema.safeParse({ id });
  if (!parsed.success) return fail("Invalid job id.", "INVALID_JOB_ID", 400);
  const command = createCommand({
    type: "jobs.get",
    requestedBy: "api",
    entityType: "job",
    entityId: parsed.data.id,
    payload: parsed.data
  });
  const result = await defaultBus(bus).execute(command);
  return commandResult(result, 200, 404);
}

export async function runJobPipeline(id: string, request: Request, bus?: CommandBus) {
  const idParsed = jobGetSchema.safeParse({ id });
  if (!idParsed.success) return fail("Invalid job id.", "INVALID_JOB_ID", 400);
  const bodyParsed = runPipelineBodySchema.safeParse(await jsonBody(request));
  if (!bodyParsed.success) return fail("Invalid job pipeline payload.", "INVALID_JOB_PIPELINE_PAYLOAD", 400);
  const body = bodyParsed.data;
  const command = createCommand({
    type: "jobs.run_pipeline",
    requestedBy: "api",
    userId: body.userId,
    entityType: "job",
    entityId: idParsed.data.id,
    payload: {
      id: idParsed.data.id,
      title: body.title,
      company: body.company ?? body.companyName,
      companyId: body.companyId,
      location: body.location,
      description: body.description,
      url: body.url,
      source: body.source ?? "api",
      employmentType: body.employmentType,
      certifications: body.certifications,
      requiredFields: body.requiredFields,
      hasEasyApply: body.hasEasyApply,
      userId: body.userId
    }
  });
  const result = await defaultBus(bus).execute(command);
  return commandResult(result);
}
