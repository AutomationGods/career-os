export type AiProviderId = "openrouter";

export type AiModelUseCase =
  | "default"
  | "reasoning"
  | "resume_generation"
  | "cover_letter_generation"
  | "recruiter_message"
  | "job_fit_scoring"
  | "structured_extraction";

export interface AiProviderConfig {
  id: AiProviderId;
  displayName: string;
  apiBaseUrl: string;
  chatCompletionsUrl: string;
  apiKeyEnv: string;
  attributionHeaders: {
    referer: "HTTP-Referer";
    title: "X-OpenRouter-Title";
  };
}

export interface AiModelProviderMapping {
  useCase: AiModelUseCase;
  provider: AiProviderId;
  model: string;
  reason: string;
}

export interface OpenRouterRequestOptions {
  apiKey: string;
  messages: OpenRouterChatMessage[];
  model?: string;
  modelUseCase?: AiModelUseCase;
  referer?: string;
  title?: string;
  body?: Record<string, unknown>;
}

export interface OpenRouterChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface OpenRouterChatRequest {
  url: string;
  init: RequestInit;
}

export const openRouterProvider: AiProviderConfig = {
  id: "openrouter",
  displayName: "OpenRouter",
  apiBaseUrl: "https://openrouter.ai/api/v1",
  chatCompletionsUrl: "https://openrouter.ai/api/v1/chat/completions",
  apiKeyEnv: "OPENROUTER_API_KEY",
  attributionHeaders: {
    referer: "HTTP-Referer",
    title: "X-OpenRouter-Title"
  }
};

export const aiProviders: Record<AiProviderId, AiProviderConfig> = {
  openrouter: openRouterProvider
};

export const aiModelProviderMappings: Record<AiModelUseCase, AiModelProviderMapping> = {
  default: {
    useCase: "default",
    provider: "openrouter",
    model: "openrouter/auto",
    reason: "General product AI work should route through OpenRouter auto routing."
  },
  reasoning: {
    useCase: "reasoning",
    provider: "openrouter",
    model: "~openai/gpt-latest",
    reason: "Reasoning-heavy workflows use OpenRouter's latest OpenAI flagship alias without direct OpenAI API calls."
  },
  resume_generation: {
    useCase: "resume_generation",
    provider: "openrouter",
    model: "~openai/gpt-latest",
    reason: "Resume drafting needs high instruction-following while still using OpenRouter as the provider."
  },
  cover_letter_generation: {
    useCase: "cover_letter_generation",
    provider: "openrouter",
    model: "~openai/gpt-latest",
    reason: "Company-specific writing uses the OpenRouter OpenAI-family latest alias."
  },
  recruiter_message: {
    useCase: "recruiter_message",
    provider: "openrouter",
    model: "~openai/gpt-latest",
    reason: "Recruiter outreach drafts use the same OpenRouter-hosted writing model family."
  },
  job_fit_scoring: {
    useCase: "job_fit_scoring",
    provider: "openrouter",
    model: "openrouter/auto",
    reason: "Classification and scoring can use OpenRouter auto routing for cost and reliability."
  },
  structured_extraction: {
    useCase: "structured_extraction",
    provider: "openrouter",
    model: "openrouter/auto",
    reason: "Structured extraction stays provider-neutral through OpenRouter routing."
  }
};

export function getAiModelProviderMapping(useCase: AiModelUseCase = "default") {
  return aiModelProviderMappings[useCase];
}

export function buildOpenRouterHeaders(options: { apiKey: string; referer?: string; title?: string }) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
    "Content-Type": "application/json"
  };

  if (options.referer) headers[openRouterProvider.attributionHeaders.referer] = options.referer;
  if (options.title) headers[openRouterProvider.attributionHeaders.title] = options.title;

  return headers;
}

export function buildOpenRouterChatCompletionsRequest(options: OpenRouterRequestOptions): OpenRouterChatRequest {
  const mapping = getAiModelProviderMapping(options.modelUseCase);
  return {
    url: openRouterProvider.chatCompletionsUrl,
    init: {
      method: "POST",
      headers: buildOpenRouterHeaders(options),
      body: JSON.stringify({
        ...options.body,
        model: options.model ?? mapping.model,
        messages: options.messages
      })
    }
  };
}

export interface OpenAiOAuthProviderConfig {
  id: "openai";
  displayName: "OpenAI";
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  defaultScopes: string[];
  codeChallengeMethod: "S256";
}

export interface OpenAiOAuthAuthorizationOptions {
  clientId: string;
  redirectUri: string;
  state?: string;
  scopes?: string[];
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
  responseMode?: "query" | "fragment" | "form_post";
}

export interface OpenAiOAuthTokenRequest {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
  clientSecret?: string;
}

export interface OpenAiOAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  [key: string]: unknown;
}

export interface OpenAiOAuthUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

export class OpenAiOAuthError extends Error {
  constructor(readonly status: number, readonly details: unknown) {
    super(`OpenAI OAuth request failed with status ${status}`);
    this.name = "OpenAiOAuthError";
  }
}

export const openAiOAuthProvider: OpenAiOAuthProviderConfig = {
  id: "openai",
  displayName: "OpenAI",
  issuer: "https://auth.openai.com",
  authorizationEndpoint: "https://auth.openai.com/api/accounts/authorize",
  tokenEndpoint: "https://auth.openai.com/api/accounts/oauth/token",
  userInfoEndpoint: "https://auth.openai.com/api/accounts/oauth/userinfo",
  defaultScopes: ["openid", "profile", "email", "offline_access"],
  codeChallengeMethod: "S256"
};

export function supportsOpenAiOAuth() {
  return true;
}

export function buildOpenAiOAuthAuthorizationUrl(options: OpenAiOAuthAuthorizationOptions) {
  const url = new URL(openAiOAuthProvider.authorizationEndpoint);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (options.scopes ?? openAiOAuthProvider.defaultScopes).join(" "));

  if (options.state) url.searchParams.set("state", options.state);
  if (options.responseMode) url.searchParams.set("response_mode", options.responseMode);
  if (options.codeChallenge) {
    url.searchParams.set("code_challenge", options.codeChallenge);
    url.searchParams.set("code_challenge_method", options.codeChallengeMethod ?? openAiOAuthProvider.codeChallengeMethod);
  }

  return url;
}

export function createOAuthState(byteLength = 32) {
  return createRandomBase64Url(byteLength);
}

export function createPkceVerifier(byteLength = 32) {
  return createRandomBase64Url(byteLength);
}

export async function createPkceChallenge(codeVerifier: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is required to create an OAuth PKCE challenge.");
  }

  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return base64UrlEncode(new Uint8Array(digest));
}

export async function exchangeOpenAiOAuthCode(request: OpenAiOAuthTokenRequest, fetchImpl: typeof fetch = fetch): Promise<OpenAiOAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: request.clientId,
    code: request.code,
    redirect_uri: request.redirectUri
  });

  if (request.codeVerifier) body.set("code_verifier", request.codeVerifier);
  if (request.clientSecret) body.set("client_secret", request.clientSecret);

  const response = await fetchImpl(openAiOAuthProvider.tokenEndpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = await safeJson(response);

  if (!response.ok) throw new OpenAiOAuthError(response.status, data);

  return data as OpenAiOAuthTokenResponse;
}

export async function fetchOpenAiOAuthUserInfo(accessToken: string, fetchImpl: typeof fetch = fetch): Promise<OpenAiOAuthUserInfo> {
  const response = await fetchImpl(openAiOAuthProvider.userInfoEndpoint, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`
    }
  });
  const data = await safeJson(response);

  if (!response.ok) throw new OpenAiOAuthError(response.status, data);

  return data as OpenAiOAuthUserInfo;
}

function createRandomBase64Url(byteLength: number) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Web Crypto API is required to create OAuth random values.");
  }

  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa !== "function") {
    throw new Error("Base64 encoding support is required for OAuth helpers.");
  }

  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
