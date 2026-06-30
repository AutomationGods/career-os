import { exchangeOpenAiOAuthCode, fetchOpenAiOAuthUserInfo, OpenAiOAuthError, type OpenAiOAuthTokenResponse, type OpenAiOAuthUserInfo } from "@career-os/ai";
import { prisma } from "@career-os/db";
import { NextResponse } from "next/server";
import { fail } from "../../../../_lib/responses";

const verifierCookie = "career_os_openai_oauth_verifier";
const stateCookie = "career_os_openai_oauth_state";
const openAiOAuthSettingKey = "ai.openai.oauth.connection";
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type PrismaSystemSettingClient = {
  systemSetting: {
    upsert(args: { where: { key: string }; create: { key: string; value: JsonValue }; update: { value: JsonValue } }): Promise<unknown>;
  };
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  if (error) {
    return fail(requestUrl.searchParams.get("error_description") ?? error, "OPENAI_OAUTH_ERROR", 400);
  }

  const clientId = process.env.OPENAI_OAUTH_CLIENT_ID;
  if (!clientId) {
    return fail("OPENAI_OAUTH_CLIENT_ID is required before completing OpenAI OAuth.", "OPENAI_OAUTH_NOT_CONFIGURED", 500);
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) return fail("OpenAI OAuth callback did not include a code.", "OPENAI_OAUTH_CODE_REQUIRED", 400);

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const expectedState = cookies[stateCookie];
  const actualState = requestUrl.searchParams.get("state");
  if (!expectedState || !actualState || expectedState !== actualState) {
    return fail("OpenAI OAuth state check failed.", "OPENAI_OAUTH_STATE_MISMATCH", 400);
  }

  const codeVerifier = cookies[verifierCookie];
  if (!codeVerifier) return fail("OpenAI OAuth PKCE verifier is missing.", "OPENAI_OAUTH_VERIFIER_REQUIRED", 400);

  const redirectUri = process.env.OPENAI_OAUTH_REDIRECT_URI ?? new URL("/api/ai/openai/oauth/callback", request.url).toString();
  let token: OpenAiOAuthTokenResponse;
  try {
    token = await exchangeOpenAiOAuthCode({
      clientId,
      clientSecret: process.env.OPENAI_OAUTH_CLIENT_SECRET,
      code,
      redirectUri,
      codeVerifier
    });
  } catch (error) {
    if (error instanceof OpenAiOAuthError) {
      return fail("OpenAI OAuth token exchange failed.", "OPENAI_OAUTH_TOKEN_EXCHANGE_FAILED", error.status);
    }
    return fail("OpenAI OAuth token exchange failed.", "OPENAI_OAUTH_TOKEN_EXCHANGE_FAILED", 502);
  }
  if (!token.access_token) return fail("OpenAI OAuth did not return an access token.", "OPENAI_OAUTH_ACCESS_TOKEN_REQUIRED", 502);

  const userInfo = await fetchUserInfoSafely(token.access_token);
  try {
    await persistOpenAiOAuthToken(token, userInfo);
  } catch {
    return fail("OpenAI OAuth token persistence failed.", "OPENAI_OAUTH_TOKEN_PERSISTENCE_FAILED", 503);
  }

  const response = NextResponse.json({
    ok: true,
    data: {
      provider: "openai",
      oauthSupported: true,
      connected: Boolean(token.access_token),
      token: {
        tokenType: token.token_type,
        expiresIn: token.expires_in,
        scope: token.scope,
        hasAccessToken: Boolean(token.access_token),
        hasRefreshToken: Boolean(token.refresh_token),
        hasIdToken: Boolean(token.id_token)
      },
      userInfo: redactUserInfo(userInfo),
      tokenStorage: "prisma_system_setting"
    }
  });
  response.cookies.set(verifierCookie, "", { path: "/api/ai/openai/oauth", maxAge: 0 });
  response.cookies.set(stateCookie, "", { path: "/api/ai/openai/oauth", maxAge: 0 });
  return response;
}

async function persistOpenAiOAuthToken(token: OpenAiOAuthTokenResponse, userInfo: OpenAiOAuthUserInfo | undefined) {
  const savedAt = new Date();
  const expiresAt = token.expires_in ? new Date(savedAt.getTime() + token.expires_in * 1000).toISOString() : undefined;
  const value = withoutUndefined({
    provider: "openai",
    connected: true,
    tokenType: token.token_type,
    scope: token.scope,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    idToken: token.id_token,
    expiresIn: token.expires_in,
    expiresAt,
    userInfo: redactUserInfo(userInfo),
    updatedAt: savedAt.toISOString()
  });

  await (prisma as unknown as PrismaSystemSettingClient).systemSetting.upsert({
    where: { key: openAiOAuthSettingKey },
    create: { key: openAiOAuthSettingKey, value },
    update: { value }
  });
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toJsonValue).filter((entry): entry is JsonValue => entry !== undefined);
  if (value && typeof value === "object") return withoutUndefined(value as Record<string, unknown>);
  return undefined;
}

function withoutUndefined(value: Record<string, unknown>): { [key: string]: JsonValue } {
  const entries = Object.entries(value)
    .map(([key, entryValue]) => [key, toJsonValue(entryValue)] as const)
    .filter((entry): entry is readonly [string, JsonValue] => entry[1] !== undefined);
  return Object.fromEntries(entries);
}

async function fetchUserInfoSafely(accessToken: string) {
  try {
    return await fetchOpenAiOAuthUserInfo(accessToken);
  } catch {
    return undefined;
  }
}

function redactUserInfo(userInfo: OpenAiOAuthUserInfo | undefined) {
  if (!userInfo) return undefined;
  return withoutUndefined({
    sub: userInfo.sub,
    email: userInfo.email,
    emailVerified: userInfo.email_verified,
    name: userInfo.name,
    picture: userInfo.picture
  });
}

function parseCookies(cookieHeader: string) {
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}
