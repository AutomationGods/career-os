import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Cover Letter Domain",
  slug: "cover-letter",
  manager: "Cover Letter Manager",
  capabilities: ["CoverLetterGenerationCapability"],
  workers: ["CompanySpecificCoverLetterWorker", "ShortCoverLetterWorker", "NoCoverLetterDecisionWorker"],
  tools: ["HumanReviewGateTool", "CompanyResearchPlaceholderTool"],
  commands: ["cover_letter.generate_placeholder"],
  events: ["cover_letter.placeholder_created"],
  permissions: ["generate_cover_letter"],
  dependencies: ["application-packet"],
  status: "partial",
  version: "0.2.0"
};


export class CoverLetterManager {
  readonly definition = definition;

  createPlaceholder(companyName: string) {
    return {
      eventType: "cover_letter.placeholder_created" as const,
      content: `Cover letter placeholder for ${companyName}; requires review before use.`
    };
  }
}
