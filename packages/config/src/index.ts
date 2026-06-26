export const trustedModeConfig = {
  trusted_mode_enabled: false,
  auto_send_enabled: false,
  auto_submit_enabled: false,
  require_approval_before_send: true,
  require_approval_before_submit: true,
  require_approval_for_sensitive_questions: true
} as const;

export type TrustedModeConfigKey = keyof typeof trustedModeConfig;

export class StaticConfigService {
  constructor(private readonly values: Record<string, unknown> = trustedModeConfig) {}

  get(key: string) {
    return this.values[key];
  }
}

export const configService = new StaticConfigService();
