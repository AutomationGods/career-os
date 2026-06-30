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
  openai_oauth_scopes_env: "OPENAI_OAUTH_SCOPES"
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
