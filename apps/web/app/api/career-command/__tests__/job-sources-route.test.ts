import { describe, expect, it } from "vitest";
import { GET } from "../job-sources/route";

describe("Career Command job source diagnostics", () => {
  it("reports Remotive and Manual Job Import as enabled and scraping sources disabled honestly", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.enabledSources.length).toBe(2);
    expect(body.data.enabledSources.includes("Remotive public API")).toBe(true);
    expect(body.data.enabledSources.includes("Manual Job Import")).toBe(true);
    for (const source of ["LinkedIn scraping", "Indeed scraping", "Dice scraping", "ClearanceJobs scraping", "Gmail", "browser automation", "auto-apply", "CAPTCHA bypass"]) expect(body.data.disabledSources.includes(source)).toBe(true);
    expect(body.data.disabledSources.includes("Remotive public API")).toBe(false);
    expect(body.data.disabledSources.includes("Manual Job Import")).toBe(false);
  });
});
