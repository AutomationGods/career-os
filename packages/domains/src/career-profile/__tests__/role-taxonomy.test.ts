import { describe, expect, it } from "vitest";
import { normalizeCareerTargets } from "../role-taxonomy";

describe("Career Profile role taxonomy", () => {
  it("prioritizes certifications as job search keywords", () => {
    const result = normalizeCareerTargets([
      { category: "certification", claim: "Splunk Enterprise Certified Administrator" },
      { category: "certification", claim: "Splunk Enterprise Certified Architect" },
      { category: "role", claim: "Security Operations Engineer" }
    ]);

    expect(result.certificationsUsedAsSearchKeywords.join("|")).toBe("Splunk Enterprise Certified Administrator|Splunk Enterprise Certified Architect");
    expect(result.suggestedJobSearchKeywords.slice(0, 2).join("|")).toBe("Splunk Enterprise Certified Administrator|Splunk Enterprise Certified Architect");
  });
});
