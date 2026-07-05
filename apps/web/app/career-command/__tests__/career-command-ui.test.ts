import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson } from "../fetch-json";

const careerCommandFiles = [
  "panel.tsx",
  "helpers.ts",
  "job-import-section.tsx",
  "job-matches-section.tsx",
  "mission-report-section.tsx",
  "resume-upload-section.tsx"
];
const careerCommandSource = careerCommandFiles.map((file) => readFileSync(join(process.cwd(), "apps/web/app/career-command", file), "utf8")).join("\n");
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Career Command UI diagnostics", () => {
  it("returns undefined instead of throwing when status fetch fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    await expect(getJson("/api/career-command/status")).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/career-command/status");
  });

  it("shows source details, safe search terms, and match reasons", () => {
    expect(careerCommandSource.includes("Active sources")).toBe(true);
    expect(careerCommandSource.includes("Off-limits sources")).toBe(true);
    expect(careerCommandSource.includes("Search details")).toBe(true);
    expect(careerCommandSource.includes("Safety filters")).toBe(true);
    expect(careerCommandSource.includes("Final Resume Review")).toBe(true);
    expect(careerCommandSource.includes("Review these resume findings before treating the Command Center as complete.")).toBe(true);
    expect(careerCommandSource.includes("Why it matches")).toBe(true);
    expect(careerCommandSource.includes("Weak signals")).toBe(true);
    expect(careerCommandSource.includes("Why it may be weak")).toBe(true);
    expect(careerCommandSource.includes("Rejection reason")).toBe(true);
    expect(careerCommandSource.includes("Upload Resume File")).toBe(true);
    expect(careerCommandSource.includes("Upload failed: Internal Server Error.")).toBe(true);
    expect(careerCommandSource.includes("career-command:last-selected-resume-filename")).toBe(true);
    expect(careerCommandSource.includes(".pdf,.doc,.docx,.txt,.md,.rtf")).toBe(true);
    expect(careerCommandSource.includes("Add a Job Manually")).toBe(true);
    expect(careerCommandSource.includes("Paste Multiple Jobs")).toBe(true);
    expect(careerCommandSource.includes("Search These Sites Manually")).toBe(true);
    expect(careerCommandSource.includes("Splunk Architect remote")).toBe(true);
    expect(careerCommandSource.includes("SIEM Engineer Splunk")).toBe(true);
    expect(careerCommandSource.includes("Cribl Engineer remote")).toBe(true);
    expect(careerCommandSource.includes("Shorepoint")).toBe(false);
    expect(careerCommandSource.includes("Splunk Enterprise Certified Architect")).toBe(false);
  });
});
