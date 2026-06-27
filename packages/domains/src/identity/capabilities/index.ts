import type { CapabilityDefinition } from "@career-os/shared";

export const profileFactsCapability: CapabilityDefinition = {
  name: "ProfileFactsCapability",
  description: "Maintains verified source-of-truth user facts for truthfulness-guarded document generation.",
  workers: ["ProfileFactsWorker"],
  commands: ["profile_facts.create", "profile_facts.update", "profile_facts.archive", "profile_facts.verify", "profile_facts.block", "profile_facts.list", "profile_facts.seed_initial"],
  events: ["profile_fact.created", "profile_fact.updated", "profile_fact.verified", "profile_fact.blocked", "profile_fact.archived", "profile_facts.seeded"],
  permissions: ["modify_master_profile"]
};

export const capabilities = [profileFactsCapability.name];
