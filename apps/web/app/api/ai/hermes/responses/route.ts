import { buildHermesAgentResponsesRequest, hermesAgentProvider } from "@career-os/ai";
import { z } from "zod";
import { isUnauthenticatedError, requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { fail, ok } from "../../../_lib/responses";

export const dynamic = "force-dynamic";

const hermesResponseRequestSchema = z.object({
  input: z.string().min(1).max(12_000),
  instructions: z.string().max(4_000).optional(),
  conversation: z.string().max(128).optional(),
  store: z.boolean().default(true)
});

class HermesProxyError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly upstreamStatus?: number) {
    super(message);
    this.name = "HermesProxyError";
  }
}

export async function POST(request: Request) {
  let authUser: Awaited<ReturnType<typeof requireAuthenticatedCareerUser>>;
  try {
    authUser = await requireAuthenticatedCareerUser();
  } catch (error) {
    if (isUnauthenticatedError(error)) return fail("Authentication required.", "AUTHENTICATION_REQUIRED", 401);
    throw error;
  }

  const config = hermesRuntimeConfig();
  if (!config.enabled) {
    return ok({
      provider: "hermes",
      enabled: false,
      configured: config.configured,
      status: "disabled",
      model: config.model
    });
  }

  if (!config.configured) {
    return fail("Hermes Agent is enabled but not configured.", "HERMES_AGENT_NOT_CONFIGURED", 503);
  }

  const parsed = hermesResponseRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid Hermes Agent response request.", "INVALID_HERMES_AGENT_RESPONSE_REQUEST", 400);
  }

  const conversation = parsed.data.conversation?.trim() || `career-os:${authUser.userId}:default`;
  const sessionKey = `career-os:user:${authUser.userId}`;
  const hermesRequest = buildHermesAgentResponsesRequest({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    input: parsed.data.input,
    instructions: parsed.data.instructions,
    conversation,
    sessionKey,
    store: parsed.data.store
  });

  try {
    const data = await fetchHermesJson(hermesRequest, config.timeoutMs);
    return ok(sanitizeHermesResponse(data));
  } catch (error) {
    if (error instanceof HermesProxyError) {
      return Response.json({
        ok: false,
        error: {
          message: error.message,
          code: error.code,
          upstreamStatus: error.upstreamStatus
        }
      }, { status: error.status });
    }

    return fail("Hermes Agent is unavailable.", "HERMES_AGENT_UNAVAILABLE", 503);
  }
}

function hermesRuntimeConfig() {
  const apiKey = process.env.HERMES_AGENT_API_KEY?.trim() ?? "";
  const configuredBaseUrl = process.env.HERMES_AGENT_API_BASE_URL?.trim() ?? "";
  const baseUrl = configuredBaseUrl || hermesAgentProvider.apiBaseUrl;
  const model = process.env.HERMES_AGENT_MODEL?.trim() || "hermes-agent";
  const timeoutMs = parsePositiveInteger(process.env.HERMES_AGENT_TIMEOUT_MS, 60_000);

  return {
    enabled: process.env.HERMES_AGENT_ENABLED === "true",
    configured: Boolean(configuredBaseUrl && apiKey),
    apiKey,
    baseUrl,
    model,
    timeoutMs
  };
}

async function fetchHermesJson(request: { url: string; init: RequestInit }, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request.url, { ...request.init, signal: controller.signal });
    const data = await safeJson(response);
    if (!response.ok) {
      throw new HermesProxyError("Hermes Agent response request failed.", "HERMES_AGENT_UPSTREAM_ERROR", 502, response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof HermesProxyError) throw error;
    if (isAbortError(error)) throw new HermesProxyError("Hermes Agent response request timed out.", "HERMES_AGENT_TIMEOUT", 504);
    throw new HermesProxyError("Hermes Agent is unavailable.", "HERMES_AGENT_UNAVAILABLE", 503);
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function sanitizeHermesResponse(data: unknown) {
  const record = isRecord(data) ? data : {};
  const output = record.output;
  const outputText = typeof record.output_text === "string" ? record.output_text : extractOutputText(output);

  return {
    provider: "hermes",
    id: typeof record.id === "string" ? record.id : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    output,
    output_text: outputText,
    usage: isRecord(record.usage) ? record.usage : undefined
  };
}

function extractOutputText(output: unknown): string | undefined {
  const fragments: string[] = [];
  collectTextFragments(output, fragments);
  const text = fragments.join("\n").trim();
  return text || undefined;
}

function collectTextFragments(value: unknown, fragments: string[]) {
  if (typeof value === "string") {
    fragments.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectTextFragments(entry, fragments);
    return;
  }

  if (!isRecord(value)) return;

  if (typeof value.text === "string") fragments.push(value.text);
  if (typeof value.content === "string") fragments.push(value.content);
  if (Array.isArray(value.content)) collectTextFragments(value.content, fragments);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
