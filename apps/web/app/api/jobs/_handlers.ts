import { createCommand, createDefaultCommandBus, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";
import { requireMutationUser, requireUser, sessionErrorResponse } from "../_lib/session";

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

type BusLike = Pick<CommandBus, "execute">;

function defaultBus(bus?: BusLike) {
  return bus ?? createDefaultCommandBus();
}

export async function importManualJob(request: Request, bus?: BusLike) {
  try {
    const user = await requireMutationUser(request);
    const parsed = manualJobImportSchema.safeParse(await jsonBody(request));
    if (!parsed.success) return fail("Invalid manual job import payload.", "INVALID_JOB_IMPORT", 400);
    const body = { ...parsed.data, userId: user.id };
    const command = createCommand({
      type: "jobs.import_manual_url",
      requestedBy: "api",
      userId: user.id,
      entityType: "job",
      payload: { ...body, companyName: body.companyName ?? body.company, source: body.source ?? "manual" }
    });
    const result = await defaultBus(bus).execute(command);
    return commandResult(result, 201, 400);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function listJobs(request: Request, bus?: BusLike) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const parsed = jobListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return fail("Invalid job list query.", "INVALID_JOB_LIST_QUERY", 400);
    const payload = { ...parsed.data, userId: user.id };
    const command = createCommand({
      type: "jobs.list",
      requestedBy: "api",
      userId: user.id,
      entityType: "job",
      payload
    });
    const result = await defaultBus(bus).execute(command);
    return commandResult(result);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function getJob(id: string, request: Request, bus?: BusLike) {
  try {
    const user = await requireUser(request);
    const parsed = jobGetSchema.safeParse({ id });
    if (!parsed.success) return fail("Invalid job id.", "INVALID_JOB_ID", 400);
    const command = createCommand({
      type: "jobs.get",
      requestedBy: "api",
      userId: user.id,
      entityType: "job",
      entityId: parsed.data.id,
      payload: { ...parsed.data, userId: user.id }
    });
    const result = await defaultBus(bus).execute(command);
    return commandResult(result, 200, 404);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function runJobPipeline(id: string, request: Request, bus?: BusLike) {
  try {
    const user = await requireMutationUser(request);
    const idParsed = jobGetSchema.safeParse({ id });
    if (!idParsed.success) return fail("Invalid job id.", "INVALID_JOB_ID", 400);
    const bodyParsed = runPipelineBodySchema.safeParse(await jsonBody(request));
    if (!bodyParsed.success) return fail("Invalid job pipeline payload.", "INVALID_JOB_PIPELINE_PAYLOAD", 400);
    const body = { ...bodyParsed.data, userId: user.id };
    const command = createCommand({
      type: "jobs.run_pipeline",
      requestedBy: "api",
      userId: user.id,
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
        userId: user.id
      }
    });
    const result = await defaultBus(bus).execute(command);
    return commandResult(result);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}
