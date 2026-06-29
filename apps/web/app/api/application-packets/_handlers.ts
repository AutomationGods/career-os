import { createCommand, createDefaultCommandBus, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";
import { requireMutationUser, requireUser, sessionErrorResponse } from "../_lib/session";

const packetStatusSchema = z.enum(["not_started", "ready_to_generate", "generated", "awaiting_review", "ready_to_apply", "submitted", "followup_due", "closed"]);

export const applicationPacketCreateSchema = z.object({
  id: z.string().min(1).optional(),
  packetId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  jobId: z.string().min(1),
  companyId: z.string().min(1).optional(),
  personId: z.string().min(1).optional(),
  selectedJob: z.unknown().optional(),
  job: z.unknown().optional(),
  selectedCompany: z.unknown().optional(),
  selectedPerson: z.unknown().optional(),
  fitScoreSummary: z.unknown().optional(),
  notes: z.array(z.string().min(1)).optional().default([])
}).passthrough();

export const applicationPacketListSchema = z.object({
  userId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  status: packetStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export const applicationPacketIdSchema = z.object({
  id: z.string().min(1)
});

export const applicationPacketGenerateSchema = z.object({
  userId: z.string().min(1).optional()
}).passthrough();

export const applicationPacketStatusUpdateSchema = z.object({
  userId: z.string().min(1).optional(),
  status: packetStatusSchema,
  nextAction: z.string().min(1).optional()
});

type BusLike = Pick<CommandBus, "execute">;

async function jsonBody(request: Request) {
  return request.json().catch(() => ({}));
}

function busOrDefault(bus?: BusLike) {
  return bus ?? createDefaultCommandBus();
}

export async function listApplicationPackets(request: Request, bus?: BusLike) {
  try {
    const user = await requireUser(request);
    const parsed = applicationPacketListSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return fail("Invalid application packet list query.", "INVALID_APPLICATION_PACKET_LIST", 400);
    const payload = { ...parsed.data, userId: user.id };
    const command = createCommand({
      type: "application_packets.list",
      requestedBy: "api",
      userId: user.id,
      entityType: "application_packet",
      entityId: "list",
      payload
    });
    return commandResult(await busOrDefault(bus).execute(command));
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function createApplicationPacket(request: Request, bus?: BusLike) {
  try {
    const user = await requireMutationUser(request);
    const parsed = applicationPacketCreateSchema.safeParse(await jsonBody(request));
    if (!parsed.success) return fail("Invalid application packet create payload.", "INVALID_APPLICATION_PACKET_CREATE", 400);
    const payload = { ...parsed.data, userId: user.id };
    const command = createCommand({
      type: "application_packets.create",
      requestedBy: "api",
      userId: user.id,
      entityType: "job",
      entityId: parsed.data.jobId,
      payload
    });
    return commandResult(await busOrDefault(bus).execute(command), 201, 400);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function getApplicationPacket(id: string, request: Request, bus?: BusLike) {
  try {
    const user = await requireUser(request);
    const parsed = applicationPacketIdSchema.safeParse({ id });
    if (!parsed.success) return fail("Invalid application packet id.", "INVALID_APPLICATION_PACKET_ID", 400);
    const command = createCommand({
      type: "application_packets.get",
      requestedBy: "api",
      userId: user.id,
      entityType: "application_packet",
      entityId: parsed.data.id,
      payload: { ...parsed.data, userId: user.id }
    });
    return commandResult(await busOrDefault(bus).execute(command), 200, 404);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function generateApplicationPacketPlaceholders(id: string, request: Request, bus?: BusLike) {
  try {
    const user = await requireMutationUser(request);
    const idParsed = applicationPacketIdSchema.safeParse({ id });
    if (!idParsed.success) return fail("Invalid application packet id.", "INVALID_APPLICATION_PACKET_ID", 400);
    const body = applicationPacketGenerateSchema.safeParse(await jsonBody(request));
    if (!body.success) return fail("Invalid application packet generate payload.", "INVALID_APPLICATION_PACKET_GENERATE", 400);
    const command = createCommand({
      type: "application_packets.generate_placeholders",
      requestedBy: "api",
      userId: user.id,
      entityType: "application_packet",
      entityId: idParsed.data.id,
      payload: { ...body.data, id: idParsed.data.id, userId: user.id }
    });
    return commandResult(await busOrDefault(bus).execute(command), 200, 404);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function updateApplicationPacketStatus(id: string, request: Request, bus?: BusLike) {
  try {
    const user = await requireMutationUser(request);
    const idParsed = applicationPacketIdSchema.safeParse({ id });
    if (!idParsed.success) return fail("Invalid application packet id.", "INVALID_APPLICATION_PACKET_ID", 400);
    const body = applicationPacketStatusUpdateSchema.safeParse(await jsonBody(request));
    if (!body.success) return fail("Invalid application packet status payload.", "INVALID_APPLICATION_PACKET_STATUS", 400);
    const command = createCommand({
      type: "application_packets.update_status",
      requestedBy: "api",
      userId: user.id,
      entityType: "application_packet",
      entityId: idParsed.data.id,
      payload: { ...body.data, id: idParsed.data.id, userId: user.id }
    });
    return commandResult(await busOrDefault(bus).execute(command));
  } catch (error) {
    return sessionErrorResponse(error);
  }
}
