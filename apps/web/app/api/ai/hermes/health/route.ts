import { buildHermesAgentCapabilitiesRequest, buildHermesAgentHealthRequest, hermesAgentProvider } from "@career-os/ai";
import { isUnauthenticatedError, requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { fail, ok } from "../../../_lib/responses";

export const dynamic = "force-dynamic";

class HermesProxyError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly upstreamStatus?: number) {
    super(message);
    this.name = "HermesProxyError";
  }
}

export async function GET() {
  try {
    await requireAuthenticatedCareerUser();
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

  try {
    const [health, capabilities] = await Promise.all([
      fetchHermesJson(buildHermesAgentHealthRequest({ apiKey: config.apiKey, baseUrl: config.baseUrl }), config.timeoutMs),
      fetchHermesJson(buildHermesAgentCapabilitiesRequest({ apiKey: config.apiKey, baseUrl: config.baseUrl }), config.timeoutMs)
    ]);

    return ok({
      provider: "hermes",
      enabled: true,
      configured: true,
      status: "available",
      model: config.model,
      apiBaseUrl: config.baseUrl,
      health,
      capabilities
    });
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
      throw new HermesProxyError("Hermes Agent health check failed.", "HERMES_AGENT_UPSTREAM_ERROR", 502, response.status);
    }

    return { status: response.status, data };
  } catch (error) {
    if (error instanceof HermesProxyError) throw error;
    if (isAbortError(error)) throw new HermesProxyError("Hermes Agent health check timed out.", "HERMES_AGENT_TIMEOUT", 504);
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
