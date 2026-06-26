import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { domainRegistry } from "../registry";

const domainsRoot = join(process.cwd(), "packages/domains/src");
const docsRoot = join(process.cwd(), "docs/domains");
const infrastructureEntries = new Set(["__tests__", "index.ts", "registry.ts"]);

describe("domain registry invariants", () => {
  it("keeps folders, registry, and docs aligned", () => {
    const folders = readdirSync(domainsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !infrastructureEntries.has(name))
      .sort();
    const slugs = domainRegistry.map((domain) => domain.slug).sort();
    const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

    expect(duplicateSlugs.length).toBe(0);
    expect(slugs.join("|")).toBe(folders.join("|"));

    for (const domain of domainRegistry) {
      const folder = join(domainsRoot, domain.slug);
      expect(existsSync(folder)).toBe(true);
      expect(existsSync(join(docsRoot, `${domain.slug}.md`))).toBe(true);
      expect(Boolean(domain.manager)).toBe(true);
      expect(existsSync(join(folder, "manager.ts"))).toBe(true);
      expect(existsSync(join(folder, "commands.ts"))).toBe(true);
      expect(existsSync(join(folder, "events.ts"))).toBe(true);
      expect(existsSync(join(folder, "capabilities"))).toBe(true);
      expect(existsSync(join(folder, "workers"))).toBe(true);
      expect(existsSync(join(folder, "tools"))).toBe(true);
      expect(domain.capabilities.length > 0).toBe(true);
      expect(domain.workers.length > 0).toBe(true);
      expect(domain.tools.length > 0).toBe(true);
      expect(domain.commands.length > 0).toBe(true);
      expect(domain.events.length > 0).toBe(true);
    }
  });

  it("maps platform command handlers to registered domains", () => {
    const requiredCommands = [
      "jobs.run_pipeline",
      "application_packets.create",
      "application_packets.generate_placeholders",
      "relationships.dedupe",
      "daily_mission.generate"
    ];

    for (const command of requiredCommands) {
      expect(domainRegistry.some((domain) => domain.commands.includes(command))).toBe(true);
    }
  });
});
