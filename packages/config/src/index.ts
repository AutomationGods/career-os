export const trustedModeConfig = {
  trusted_mode_enabled: false,
  auto_send_enabled: false,
  auto_submit_enabled: false,
  require_approval_before_send: true,
  require_approval_before_submit: true,
  require_approval_for_sensitive_questions: true
} as const;

export const aiIntegrationConfig = {
  primary_provider: "openrouter",
  openrouter_api_base_url: "https://openrouter.ai/api/v1",
  openrouter_api_key_env: "OPENROUTER_API_KEY",
  openrouter_site_url_env: "OPENROUTER_SITE_URL",
  openrouter_app_title_env: "OPENROUTER_APP_TITLE",
  openai_oauth_supported: true,
  openai_oauth_client_id_env: "OPENAI_OAUTH_CLIENT_ID",
  openai_oauth_client_secret_env: "OPENAI_OAUTH_CLIENT_SECRET",
  openai_oauth_redirect_uri_env: "OPENAI_OAUTH_REDIRECT_URI",
  openai_oauth_scopes_env: "OPENAI_OAUTH_SCOPES",
  hermes_agent_enabled_env: "HERMES_AGENT_ENABLED",
  hermes_agent_api_base_url_env: "HERMES_AGENT_API_BASE_URL",
  hermes_agent_api_key_env: "HERMES_AGENT_API_KEY",
  hermes_agent_model_env: "HERMES_AGENT_MODEL",
  hermes_agent_timeout_ms_env: "HERMES_AGENT_TIMEOUT_MS"
} as const;

export type TrustedModeConfigKey = keyof typeof trustedModeConfig;
export type AiIntegrationConfigKey = keyof typeof aiIntegrationConfig;

export class StaticConfigService {
  constructor(private readonly values: Record<string, unknown> = { ...trustedModeConfig, ...aiIntegrationConfig }) {}

  get(key: string) {
    return this.values[key];
  }
}

export const configService = new StaticConfigService();
