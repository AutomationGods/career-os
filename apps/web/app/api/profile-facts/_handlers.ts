import { createCommand, createDefaultCommandBus, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";

export const profileFactsListSchema = z.object({
  userId: z.string().min(1).default("demo-user"),
  status: z.string().min(1).optional(),
  filter: z.enum(["all", "verified", "needs_review", "blocked", "resume_allowed"]).default("all")
});

export const profileFactCreateSchema = z.object({
  userId: z.string().min(1).default("demo-user"),
  factType: z.string().min(1),
  category: z.string().min(1).optional(),
  label: z.string().min(1),
  value: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  sourceType: z.string().min(1).default("manual"),
  confidence: z.number().min(0).max(1).optional(),
  verificationStatus: z.string().min(1).optional(),
  allowedInResume: z.boolean().optional(),
  allowedInCoverLetter: z.boolean().optional(),
  allowedInRecruiterMessage: z.boolean().optional(),
  requiresReview: z.boolean().optional()
});

export const profileFactUpdateSchema = profileFactCreateSchema.partial().extend({ userId: z.string().min(1).optional() });

export const profileFactBlockSchema = z.object({
  userId: z.string().min(1).default("demo-user"),
  label: z.string().min(1).optional(),
  factType: z.string().min(1).optional(),
  blockedReason: z.string().min(1)
});

export const profileFactsSeedSchema = z.object({ userId: z.string().min(1).default("demo-user") });

type BusLike = Pick<CommandBus, "execute">;

function busOrDefault(bus?: BusLike) {
  return bus ?? createDefaultCommandBus();
}

export async function listProfileFacts(request: Request, bus?: BusLike) {
  const query = profileFactsListSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return fail("Invalid profile facts query.", "INVALID_PROFILE_FACTS_QUERY", 400);
  const command = createCommand({ type: "profile_facts.list", requestedBy: "api", entityType: "user", entityId: query.data.userId, payload: query.data });
  return commandResult(await busOrDefault(bus).execute(command));
}

export async function createProfileFact(request: Request, bus?: BusLike) {
  const parsed = profileFactCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid profile fact create payload.", "INVALID_PROFILE_FACT_CREATE", 400);
  const command = createCommand({ type: "profile_facts.create", requestedBy: "api", entityType: "user", entityId: parsed.data.userId, payload: parsed.data });
  return commandResult(await busOrDefault(bus).execute(command), 201, 400);
}

export async function updateProfileFact(id: string, request: Request, bus?: BusLike) {
  const parsed = profileFactUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid profile fact update payload.", "INVALID_PROFILE_FACT_UPDATE", 400);
  const command = createCommand({ type: "profile_facts.update", requestedBy: "api", entityType: "profile_fact", entityId: id, payload: { ...parsed.data, id } });
  return commandResult(await busOrDefault(bus).execute(command));
}

export async function verifyProfileFact(id: string, bus?: BusLike) {
  const command = createCommand({ type: "profile_facts.verify", requestedBy: "api", entityType: "profile_fact", entityId: id, payload: { id } });
  return commandResult(await busOrDefault(bus).execute(command));
}

export async function blockProfileFact(id: string, request: Request, bus?: BusLike) {
  const parsed = profileFactBlockSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid profile fact block payload.", "INVALID_PROFILE_FACT_BLOCK", 400);
  const command = createCommand({ type: "profile_facts.block", requestedBy: "api", entityType: "profile_fact", entityId: id, payload: { ...parsed.data, id } });
  return commandResult(await busOrDefault(bus).execute(command));
}

export async function seedInitialProfileFacts(request: Request, bus?: BusLike) {
  const parsed = profileFactsSeedSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid profile facts seed payload.", "INVALID_PROFILE_FACTS_SEED", 400);
  const command = createCommand({ type: "profile_facts.seed_initial", requestedBy: "api", entityType: "user", entityId: parsed.data.userId, payload: parsed.data });
  return commandResult(await busOrDefault(bus).execute(command), 201, 400);
}
