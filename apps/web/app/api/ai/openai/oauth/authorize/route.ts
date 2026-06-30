import { buildOpenAiOAuthAuthorizationUrl, createOAuthState, createPkceChallenge, createPkceVerifier, openAiOAuthProvider } from "@career-os/ai";
import { NextResponse } from "next/server";
import { fail } from "../../../../_lib/responses";

const verifierCookie = "career_os_openai_oauth_verifier";
const stateCookie = "career_os_openai_oauth_state";
const cookieMaxAgeSeconds = 10 * 60;

export async function GET(request: Request) {
  const clientId = process.env.OPENAI_OAUTH_CLIENT_ID;
  if (!clientId) {
    return fail("OPENAI_OAUTH_CLIENT_ID is required before starting OpenAI OAuth.", "OPENAI_OAUTH_NOT_CONFIGURED", 500);
  }

  const redirectUri = process.env.OPENAI_OAUTH_REDIRECT_URI ?? new URL("/api/ai/openai/oauth/callback", request.url).toString();
  const scopes = scopesFromEnv();
  const codeVerifier = createPkceVerifier();
  const codeChallenge = await createPkceChallenge(codeVerifier);
  const state = createOAuthState();
  const authorizationUrl = buildOpenAiOAuthAuthorizationUrl({
    clientId,
    redirectUri,
    scopes,
    state,
    codeChallenge,
    codeChallengeMethod: openAiOAuthProvider.codeChallengeMethod
  });

  const response = NextResponse.redirect(authorizationUrl);
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set(verifierCookie, codeVerifier, { httpOnly: true, sameSite: "lax", secure, path: "/api/ai/openai/oauth", maxAge: cookieMaxAgeSeconds });
  response.cookies.set(stateCookie, state, { httpOnly: true, sameSite: "lax", secure, path: "/api/ai/openai/oauth", maxAge: cookieMaxAgeSeconds });

  return response;
}

function scopesFromEnv() {
  const scopes = process.env.OPENAI_OAUTH_SCOPES?.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean) ?? [];
  return scopes.length > 0 ? scopes : openAiOAuthProvider.defaultScopes;
}
