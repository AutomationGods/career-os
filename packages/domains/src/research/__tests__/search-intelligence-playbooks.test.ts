import { describe, expect, it } from "vitest";
import { definition } from "../manager";
import { safeSearchPatternCategories, safeSearchPatterns, type SafeSearchPatternCategory } from "../search-intelligence-playbooks";

const requiredCategories: SafeSearchPatternCategory[] = [
  "ats_job_discovery",
  "company_career_page_discovery",
  "splunk_jobs",
  "cribl_jobs",
  "siem_jobs",
  "remote_devops_jobs",
  "recruiter_discovery",
  "hiring_manager_discovery",
  "company_technology_signals"
];

describe("search intelligence playbooks", () => {
  it("registers search intelligence and company recon capabilities", () => {
    expect(definition.capabilities.includes("SearchIntelligenceCapability")).toBe(true);
    expect(definition.capabilities.includes("OSINTCompanyReconCapability")).toBe(true);
    expect(definition.commands.includes("research.search_intelligence.plan")).toBe(true);
    expect(definition.commands.includes("research.company_recon.plan")).toBe(true);
    expect(definition.permissions.includes("read_jobs")).toBe(true);
  });

  it("covers every required safe search category", () => {
    const patternCategories = safeSearchPatterns.map((pattern) => pattern.category);
    for (const category of requiredCategories) {
      expect(safeSearchPatternCategories.includes(category)).toBe(true);
      expect(patternCategories.includes(category)).toBe(true);
    }
  });

  it("requires manual review and disallows LinkedIn scraping, login bypass, and automated execution", () => {
    for (const pattern of safeSearchPatterns) {
      expect(pattern.guardrails.requiresManualReview).toBe(true);
      expect(pattern.guardrails.noLoginBypass).toBe(true);
      expect(pattern.guardrails.noLinkedInScraping).toBe(true);
      expect(pattern.guardrails.noAutomatedExecution).toBe(true);
    }
  });
});
