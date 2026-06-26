import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Offer Negotiation Domain",
  slug: "offer-negotiation",
  manager: "Offer Negotiation Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["offer-negotiation.execute"],
  events: ["offer-negotiation.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class OfferNegotiationManager { readonly definition = definition; }
