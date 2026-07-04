import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson } from "../fetch-json";

const panelSource = readFileSync(join(process.cwd(), "apps/web/app/career-command/panel.tsx"), "utf8");
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
    expect(panelSource.includes("Active sources")).toBe(true);
    expect(panelSource.includes("Off-limits sources")).toBe(true);
    expect(panelSource.includes("Search details")).toBe(true);
    expect(panelSource.includes("Safety filters")).toBe(true);
    expect(panelSource.includes("Final Resume Review")).toBe(true);
    expect(panelSource.includes("Review these resume findings before treating the Command Center as complete.")).toBe(true);
    expect(panelSource.includes("Why it matches")).toBe(true);
    expect(panelSource.includes("Weak signals")).toBe(true);
    expect(panelSource.includes("Why it may be weak")).toBe(true);
    expect(panelSource.includes("Rejection reason")).toBe(true);
    expect(panelSource.includes("Upload Resume File")).toBe(true);
    expect(panelSource.includes("Upload failed: Internal Server Error.")).toBe(true);
    expect(panelSource.includes("career-command:last-selected-resume-filename")).toBe(true);
    expect(panelSource.includes(".pdf,.doc,.docx,.txt,.md,.rtf")).toBe(true);
    expect(panelSource.includes("Add a Job Manually")).toBe(true);
    expect(panelSource.includes("Paste Multiple Jobs")).toBe(true);
    expect(panelSource.includes("Search These Sites Manually")).toBe(true);
    expect(panelSource.includes("Splunk Architect remote")).toBe(true);
    expect(panelSource.includes("SIEM Engineer Splunk")).toBe(true);
    expect(panelSource.includes("Cribl Engineer remote")).toBe(true);
    expect(panelSource.includes("Shorepoint")).toBe(false);
    expect(panelSource.includes("Splunk Enterprise Certified Architect")).toBe(false);
  });
});
