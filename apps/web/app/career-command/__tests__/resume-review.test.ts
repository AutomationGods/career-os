import { describe, expect, it } from "vitest";
import { buildUploadedResumeFinalReview } from "../resume-review";

describe("uploaded resume final review", () => {
  it("calls out uploaded-resume issues while preserving certifications as search keywords", () => {
    const review = buildUploadedResumeFinalReview({
      importedDocumentCount: 1,
      profileBuilt: true,
      missingEvidence: ["Public Trust"],
      claimsToAvoid: [],
      companiesExcludedFromSearch: ["Dell Cyber LLC", "Shorepoint Inc", "Peraton"],
      ignoredResumeLinesForSearch: ["Bachelor of Arts, Health Care Administration | Athens, OH"],
      certificationsUsedAsSearchKeywords: ["Splunk Enterprise Certified Administrator", "Splunk Enterprise Certified Architect"]
    });

    const text = review.join("\n");
    expect(text.includes("Needs evidence before completion: Public Trust")).toBe(true);
    expect(text.includes("Company name preserved as resume context, not used as a job-search term: Dell Cyber LLC")).toBe(true);
    expect(text.includes("Resume line reviewed but not used as a search query: Bachelor of Arts, Health Care Administration | Athens, OH")).toBe(true);
    expect(text.includes("Certification preserved as a usable search keyword: Splunk Enterprise Certified Architect")).toBe(true);
    expect(text.includes("Do not use until corrected or verified: Splunk Enterprise Certified Architect")).toBe(false);
  });
});
