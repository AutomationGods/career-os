import { describe, expect, it } from "vitest";
import { definition } from "../manager";

describe("AI domain", () => {
  it("registers OpenRouter routing and OpenAI OAuth support", () => {
    expect(definition.status).toBe("implemented");
    expect(definition.capabilities.includes("OpenRouterModelRoutingCapability")).toBe(true);
    expect(definition.capabilities.includes("OpenAiOAuthCapability")).toBe(true);
    expect(definition.tools.includes("OpenRouterChatCompletionsTool")).toBe(true);
    expect(definition.tools.includes("OpenAiOAuthTool")).toBe(true);
  });
});
