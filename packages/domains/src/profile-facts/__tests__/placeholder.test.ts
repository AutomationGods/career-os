import { describe, expect, it } from "vitest";
import { definition } from "../manager";

describe("Profile Facts Domain registry", () => {
  it("declares runtime commands and failure events", () => {
    expect(definition.commands.includes("profile_facts.upsert")).toBe(true);
    expect(definition.commands.includes("profile_facts.list")).toBe(true);
    expect(definition.events.includes("profile_fact.upsert_failed")).toBe(true);
    expect(definition.events.includes("profile_fact.list_failed")).toBe(true);
  });
});
