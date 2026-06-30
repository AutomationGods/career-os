import type { DomainDefinition } from "@career-os/shared";

export const AI_CHAT_COMPLETE_COMMAND = "ai.chat.complete";
export const AI_OPENAI_OAUTH_AUTHORIZE_COMMAND = "ai.openai_oauth.authorize";
export const AI_OPENAI_OAUTH_EXCHANGE_CODE_COMMAND = "ai.openai_oauth.exchange_code";
export const AI_PROVIDER_CONFIGURED_EVENT = "ai.provider_configured";
export const AI_OPENAI_OAUTH_CONNECTED_EVENT = "ai.openai_oauth_connected";
export const AI_COMPLETED_EVENT = "ai.completed";

export const definition: DomainDefinition = {
  name: "AI Domain",
  slug: "ai",
  manager: "AI Manager",
  capabilities: ["OpenRouterModelRoutingCapability", "OpenAiOAuthCapability"],
  workers: ["OpenRouterModelRoutingWorker", "OpenAiOAuthWorker"],
  tools: ["OpenRouterChatCompletionsTool", "OpenAiOAuthTool"],
  commands: [AI_CHAT_COMPLETE_COMMAND, AI_OPENAI_OAUTH_AUTHORIZE_COMMAND, AI_OPENAI_OAUTH_EXCHANGE_CODE_COMMAND],
  events: [AI_PROVIDER_CONFIGURED_EVENT, AI_OPENAI_OAUTH_CONNECTED_EVENT, AI_COMPLETED_EVENT],
  permissions: [],
  dependencies: ["configuration", "openrouter", "openai-oauth"],
  status: "implemented",
  version: "1.0.0"
};

export class AiManager { readonly definition = definition; }
