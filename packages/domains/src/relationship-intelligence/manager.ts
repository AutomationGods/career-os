import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Relationship Intelligence Domain",
  slug: "relationship-intelligence",
  manager: "Relationship Intelligence Manager",
  capabilities: ["RelationshipDedupeCapability"],
  workers: ["RelationshipDedupeWorker"],
  tools: ["RelationshipMatchingTool"],
  commands: ["relationships.dedupe", "relationships.upsert"],
  events: ["relationship.deduplicated"],
  permissions: [],
  dependencies: ["event-store", "state-store"],
  status: "partial",
  version: "0.2.0"
};

export class RelationshipIntelligenceManager { readonly definition = definition; }
