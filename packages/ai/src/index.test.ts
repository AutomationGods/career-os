import { describe, expect, it } from "vitest";
import {
  aiModelProviderMappings,
  buildHermesAgentCapabilitiesRequest,
  buildHermesAgentHeaders,
  buildHermesAgentHealthRequest,
  buildHermesAgentResponsesRequest,
  buildOpenAiOAuthAuthorizationUrl,
  buildOpenRouterChatCompletionsRequest,
  exchangeOpenAiOAuthCode,
  hermesAgentProvider,
  openAiOAuthProvider,
  openRouterProvider,
  supportsOpenAiOAuth
} from "./index";

describe("AI provider configuration", () => {
  it("routes every model mapping through OpenRouter", () => {
    expect(openRouterProvider.apiBaseUrl).toBe("https://openrouter.ai/api/v1");

    for (const mapping of Object.values(aiModelProviderMappings)) {
      expect(mapping.provider).toBe("openrouter");
      expect(["openrouter/auto", "~openai/gpt-latest"].includes(mapping.model)).toBe(true);
    }
  });

  it("builds OpenRouter chat completion requests", () => {
    const request = buildOpenRouterChatCompletionsRequest({
      apiKey: "or_test_key",
      modelUseCase: "resume_generation",
      referer: "https://career-os.example",
      title: "Career OS",
      messages: [{ role: "user", content: "Draft a resume summary." }]
    });

    expect(request.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request.init.method).toBe("POST");
    const headers = request.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer or_test_key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["HTTP-Referer"]).toBe("https://career-os.example");
    expect(headers["X-OpenRouter-Title"]).toBe("Career OS");

    const body = JSON.parse(String(request.init.body));
    expect(body.model).toBe("~openai/gpt-latest");
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("Draft a resume summary.");
  });
});

describe("Hermes Agent request builders", () => {
  it("exposes Hermes as a server-side AI provider", () => {
    expect(hermesAgentProvider.id).toBe("hermes");
    expect(hermesAgentProvider.apiBaseUrl).toBe("http://127.0.0.1:8642");
    expect(hermesAgentProvider.apiKeyEnv).toBe("HERMES_AGENT_API_KEY");
  });

  it("builds Hermes headers with bearer auth and session scoping", () => {
    const headers = buildHermesAgentHeaders({ apiKey: "hermes_test_key", sessionKey: "career-os:user:user_123" });

    expect(headers.Authorization).toBe("Bearer hermes_test_key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Hermes-Session-Key"]).toBe("career-os:user:user_123");
  });

  it("builds Hermes Responses API requests", () => {
    const request = buildHermesAgentResponsesRequest({
      apiKey: "hermes_test_key",
      baseUrl: "http://localhost:8642/",
      model: "hermes-agent",
      input: "What should I do next?",
      instructions: "Answer as a career coach.",
      conversation: "career-os:user_123:default",
      sessionKey: "career-os:user:user_123",
      store: true
    });

    expect(request.url).toBe("http://localhost:8642/v1/responses");
    expect(request.init.method).toBe("POST");
    const headers = request.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer hermes_test_key");
    expect(headers["X-Hermes-Session-Key"]).toBe("career-os:user:user_123");

    const body = JSON.parse(String(request.init.body));
    expect(body.model).toBe("hermes-agent");
    expect(body.input).toBe("What should I do next?");
    expect(body.instructions).toBe("Answer as a career coach.");
    expect(body.conversation).toBe("career-os:user_123:default");
    expect(body.store).toBe(true);
  });

  it("builds Hermes health and capabilities requests", () => {
    const health = buildHermesAgentHealthRequest({ apiKey: "hermes_test_key", baseUrl: "http://localhost:8642" });
    const capabilities = buildHermesAgentCapabilitiesRequest({ apiKey: "hermes_test_key", baseUrl: "http://localhost:8642" });

    expect(health.url).toBe("http://localhost:8642/v1/health");
    expect(health.init.method).toBe("GET");
    expect(capabilities.url).toBe("http://localhost:8642/v1/capabilities");
    expect(capabilities.init.method).toBe("GET");
  });
});

describe("OpenAI OAuth support", () => {
  it("exposes current OpenAI OAuth PKCE endpoints", () => {
    expect(supportsOpenAiOAuth()).toBe(true);
    expect(openAiOAuthProvider.issuer).toBe("https://auth.openai.com");
    expect(openAiOAuthProvider.codeChallengeMethod).toBe("S256");
  });

  it("builds an OpenAI OAuth authorization URL", () => {
    const url = buildOpenAiOAuthAuthorizationUrl({
      clientId: "client_123",
      redirectUri: "https://career-os.example/api/ai/openai/oauth/callback",
      state: "state_123",
      codeChallenge: "challenge_123"
    });

    expect(url.origin + url.pathname).toBe("https://auth.openai.com/api/accounts/authorize");
    expect(url.searchParams.get("client_id")).toBe("client_123");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid profile email offline_access");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("exchanges an OpenAI OAuth code without exposing a network dependency", async () => {
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(String(init?.body).includes("grant_type=authorization_code")).toBe(true);
      expect(String(init?.body).includes("code=code_123")).toBe(true);
      return Response.json({ access_token: "token_123", token_type: "Bearer", expires_in: 3600 });
    };

    const token = await exchangeOpenAiOAuthCode({
      clientId: "client_123",
      code: "code_123",
      redirectUri: "https://career-os.example/api/ai/openai/oauth/callback",
      codeVerifier: "verifier_123"
    }, fetchImpl as typeof fetch);

    expect(token.access_token).toBe("token_123");
  });
});
