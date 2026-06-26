import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Relationship Intelligence Domain",
  slug: "relationship-intelligence",
  manager: "Relationship Intelligence Manager",
  capabilities: ["RelationshipDedupeCapability", "RecruiterDiscoveryCapability", "HiringManagerDiscoveryCapability"],
  workers: ["RelationshipDedupeWorker", "RecruiterDiscoveryWorker", "HiringManagerDiscoveryWorker"],
  tools: ["RelationshipMatchingTool", "PublicRecruiterDiscoveryTool", "PublicHiringManagerDiscoveryTool"],
  commands: ["relationships.dedupe", "relationships.upsert", "relationships.discover_recruiters.plan", "relationships.discover_hiring_managers.plan"],
  events: ["relationship.deduplicated", "relationship.recruiter_discovery_planned", "relationship.hiring_manager_discovery_planned"],
  permissions: ["read_jobs"],
  dependencies: ["research", "event-store", "state-store"],
  status: "partial",
  version: "0.3.0"
};

export class RelationshipIntelligenceManager { readonly definition = definition; }
