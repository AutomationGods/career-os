import { aiModelProviderMappings, hermesAgentProvider, openAiOAuthProvider, openRouterProvider, supportsOpenAiOAuth } from "@career-os/ai";
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
        },
        hermes: {
          id: hermesAgentProvider.id,
          displayName: hermesAgentProvider.displayName,
          enabled: process.env.HERMES_AGENT_ENABLED === "true",
          configured: Boolean(process.env.HERMES_AGENT_API_BASE_URL?.trim() && process.env.HERMES_AGENT_API_KEY?.trim()),
          apiBaseUrl: process.env.HERMES_AGENT_API_BASE_URL?.trim() || hermesAgentProvider.apiBaseUrl,
          model: process.env.HERMES_AGENT_MODEL?.trim() || "hermes-agent",
          env: {
            enabled: aiIntegrationConfig.hermes_agent_enabled_env,
            apiBaseUrl: aiIntegrationConfig.hermes_agent_api_base_url_env,
            apiKey: aiIntegrationConfig.hermes_agent_api_key_env,
            model: aiIntegrationConfig.hermes_agent_model_env,
            timeoutMs: aiIntegrationConfig.hermes_agent_timeout_ms_env
          }
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
