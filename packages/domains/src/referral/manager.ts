import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Referral Domain",
  slug: "referral",
  manager: "Referral Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["referral.execute"],
  events: ["referral.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class ReferralManager { readonly definition = definition; }
