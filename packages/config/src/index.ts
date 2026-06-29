import { z } from "zod";

export const trustedModeConfig = {
  trusted_mode_enabled: false,
  auto_send_enabled: false,
  auto_submit_enabled: false,
  require_approval_before_send: true,
  require_approval_before_submit: true,
  require_approval_for_sensitive_questions: true
} as const;

export const featureFlagDefaults = {
  ENABLE_DEV_COMMANDS: false,
  ENABLE_PLACEHOLDER_DOMAINS: false,
  ENABLE_EXTERNAL_COLLECTORS: false,
  ENABLE_PRODUCTION_DEMO_DATA: false
} as const;

export type TrustedModeConfigKey = keyof typeof trustedModeConfig;
export type FeatureFlagKey = keyof typeof featureFlagDefaults;

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");
const optionalSecretSchema = z.string().optional().default("");

const rawServerEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().trim().min(1, "REDIS_URL is required"),
  NEXTAUTH_SECRET: z.string().trim().optional().default(""),
  AUTH_SECRET: z.string().trim().optional().default(""),
  NEXTAUTH_URL: z.string().trim().url("NEXTAUTH_URL must be a URL"),
  AUTH_URL: z.string().trim().url("AUTH_URL must be a URL").optional(),
  GOOGLE_CLIENT_ID: optionalSecretSchema,
  GOOGLE_CLIENT_SECRET: optionalSecretSchema,
  AUTH_ALLOWED_EMAILS: z.string().optional().default(""),
  ALLOWED_ORIGINS: z.string().optional().default(""),
  OPENAI_API_KEY: optionalSecretSchema,
  ENABLE_DEV_COMMANDS: z.string().optional(),
  ENABLE_PLACEHOLDER_DOMAINS: z.string().optional(),
  ENABLE_EXTERNAL_COLLECTORS: z.string().optional(),
  ENABLE_PRODUCTION_DEMO_DATA: z.string().optional()
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().trim().url().optional()
});

export type ServerEnv = ReturnType<typeof validateServerEnv>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

function booleanFromEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function csv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function originFor(value: string) {
  return new URL(value).origin;
}

function isPlaceholderSecret(value: string | undefined) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return ["change-me", "changeme", "replace-me", "replace_with_secret", "replace-with-secret", "secret", "password"].includes(normalized);
}

function validateUrlProtocol(name: string, value: string, protocols: string[], issues: string[]) {
  try {
    const protocol = new URL(value).protocol.replace(":", "");
    if (!protocols.includes(protocol)) issues.push(`${name} must use one of: ${protocols.join(", ")}.`);
  } catch {
    issues.push(`${name} must be a valid URL.`);
  }
}

export function readFeatureFlags(env: Record<string, string | undefined> = process.env) {
  return {
    ENABLE_DEV_COMMANDS: booleanFromEnv(env.ENABLE_DEV_COMMANDS, featureFlagDefaults.ENABLE_DEV_COMMANDS),
    ENABLE_PLACEHOLDER_DOMAINS: booleanFromEnv(env.ENABLE_PLACEHOLDER_DOMAINS, featureFlagDefaults.ENABLE_PLACEHOLDER_DOMAINS),
    ENABLE_EXTERNAL_COLLECTORS: booleanFromEnv(env.ENABLE_EXTERNAL_COLLECTORS, featureFlagDefaults.ENABLE_EXTERNAL_COLLECTORS),
    ENABLE_PRODUCTION_DEMO_DATA: booleanFromEnv(env.ENABLE_PRODUCTION_DEMO_DATA, featureFlagDefaults.ENABLE_PRODUCTION_DEMO_DATA)
  } as const;
}

export function validateServerEnv(env: Record<string, string | undefined> = process.env) {
  const parsed = rawServerEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment:\n${parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n")}`);
  }

  const value = parsed.data;
  const issues: string[] = [];
  const authSecret = value.AUTH_SECRET || value.NEXTAUTH_SECRET;
  const authUrl = value.AUTH_URL || value.NEXTAUTH_URL;
  const allowedOrigins: string[] = [];

  try {
    allowedOrigins.push(originFor(authUrl));
    for (const origin of csv(value.ALLOWED_ORIGINS)) allowedOrigins.push(originFor(origin));
  } catch {
    issues.push("ALLOWED_ORIGINS must contain only valid URLs or origins.");
  }

  validateUrlProtocol("DATABASE_URL", value.DATABASE_URL, ["postgresql", "postgres"], issues);
  validateUrlProtocol("REDIS_URL", value.REDIS_URL, ["redis", "rediss"], issues);

  if (value.NODE_ENV === "production") {
    if (isPlaceholderSecret(authSecret) || authSecret.length < 32) issues.push("NEXTAUTH_SECRET/AUTH_SECRET must be a non-placeholder value with at least 32 characters in production.");
    if (isPlaceholderSecret(value.GOOGLE_CLIENT_ID)) issues.push("GOOGLE_CLIENT_ID is required in production.");
    if (isPlaceholderSecret(value.GOOGLE_CLIENT_SECRET)) issues.push("GOOGLE_CLIENT_SECRET is required in production.");
    if (csv(value.AUTH_ALLOWED_EMAILS).length === 0) issues.push("AUTH_ALLOWED_EMAILS must include at least one email in production single-user alpha mode.");
    if (value.NEXTAUTH_URL.startsWith("http://")) issues.push("NEXTAUTH_URL must use HTTPS in production.");
    if (readFeatureFlags(env).ENABLE_PRODUCTION_DEMO_DATA) issues.push("ENABLE_PRODUCTION_DEMO_DATA must stay false for public launch.");
  }

  if (issues.length > 0) throw new Error(`Invalid server environment:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);

  return {
    nodeEnv: value.NODE_ENV,
    databaseUrl: value.DATABASE_URL,
    redisUrl: value.REDIS_URL,
    nextAuthSecret: authSecret,
    nextAuthUrl: authUrl,
    googleClientId: value.GOOGLE_CLIENT_ID || undefined,
    googleClientSecret: value.GOOGLE_CLIENT_SECRET || undefined,
    authAllowedEmails: csv(value.AUTH_ALLOWED_EMAILS).map((email) => email.toLowerCase()),
    allowedOrigins: [...new Set(allowedOrigins)],
    openAiApiKey: value.OPENAI_API_KEY || undefined,
    featureFlags: readFeatureFlags(env)
  } as const;
}

export function validateClientEnv(env: Record<string, string | undefined> = process.env): ClientEnv {
  return clientEnvSchema.parse(env);
}

export function assertServerEnv(env: Record<string, string | undefined> = process.env) {
  return validateServerEnv(env);
}

export const featureFlags = readFeatureFlags();

export class StaticConfigService {
  constructor(private readonly values: Record<string, unknown> = { ...trustedModeConfig, ...featureFlags }) {}

  get(key: string) {
    return this.values[key];
  }

  featureEnabled(key: FeatureFlagKey) {
    return this.values[key] === true;
  }
}

export const configService = new StaticConfigService();
