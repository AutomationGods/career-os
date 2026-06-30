import { describe, expect, it } from "vitest";
import {
  aiModelProviderMappings,
  buildOpenAiOAuthAuthorizationUrl,
  buildOpenRouterChatCompletionsRequest,
  exchangeOpenAiOAuthCode,
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
