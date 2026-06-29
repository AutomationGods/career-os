import { describe, expect, it } from "vitest";
import { createApplicationPacket, generatePacketPlaceholders } from "../services";

describe("application packet service", () => {
  it("creates deterministic review-required placeholders", async () => {
    const packet = await createApplicationPacket({
      jobId: "job-1",
      selectedJob: { title: "SRE", company: "ExampleCo", source: "test", raw: {} },
      fitScoreSummary: { score: 80, segment: "Remote Commercial", highlights: ["Splunk"] }
    });
    const generated = await generatePacketPlaceholders(packet.id);

    expect(generated.status).toBe("awaiting_review");
    expect(generated.coverLetterPlaceholder?.includes("Review required")).toBe(true);
    expect(generated.recruiterMessagePlaceholder?.includes("verified Profile Facts")).toBe(true);
  });
});
