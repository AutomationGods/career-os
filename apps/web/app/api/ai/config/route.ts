import { aiModelProviderMappings, openAiOAuthProvider, openRouterProvider, supportsOpenAiOAuth } from "@career-os/ai";
import { aiIntegrationConfig } from "@career-os/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    data: {
      primaryProvider: aiIntegrationConfig.primary_provider,
      providers: {
        openrouter: {
          id: openRouterProvider.id,
          displayName: openRouterProvider.displayName,
          apiBaseUrl: openRouterProvider.apiBaseUrl,
          chatCompletionsUrl: openRouterProvider.chatCompletionsUrl,
          apiKeyEnv: openRouterProvider.apiKeyEnv,
          configured: Boolean(process.env.OPENROUTER_API_KEY),
          attributionHeaders: openRouterProvider.attributionHeaders
        }
      },
      modelProviderMappings: aiModelProviderMappings,
      oauth: {
        openai: {
          supported: supportsOpenAiOAuth(),
          configured: Boolean(process.env.OPENAI_OAUTH_CLIENT_ID),
          issuer: openAiOAuthProvider.issuer,
          authorizationEndpoint: openAiOAuthProvider.authorizationEndpoint,
          tokenEndpoint: openAiOAuthProvider.tokenEndpoint,
          userInfoEndpoint: openAiOAuthProvider.userInfoEndpoint,
          defaultScopes: openAiOAuthProvider.defaultScopes,
          codeChallengeMethod: openAiOAuthProvider.codeChallengeMethod,
          env: {
            clientId: aiIntegrationConfig.openai_oauth_client_id_env,
            clientSecret: aiIntegrationConfig.openai_oauth_client_secret_env,
            redirectUri: aiIntegrationConfig.openai_oauth_redirect_uri_env,
            scopes: aiIntegrationConfig.openai_oauth_scopes_env
          }
        }
      }
    }
  });
}
