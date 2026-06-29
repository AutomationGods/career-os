import { describe, expect, it } from "vitest";
import {
  applicationPacketFromEnvelope,
  applicationPacketsFromListEnvelope,
  buildPacketPayloadDefaultsFromJob,
  groupApplicationPacketsByStatus,
  safetyLabelForPacket
} from "./application-packets-model";

describe("application packets model", () => {
  it("normalizes single and list command envelopes", () => {
    const packetEnvelope = {
      ok: true,
      data: {
        result: {
          id: "packet-1",
          userId: "demo-user",
          jobId: "job-1",
          selectedJob: { title: "SRE", company: "ExampleCo" },
          selectedCompany: { id: "company-1", name: "ExampleCo" },
          fitScoreSummary: { score: 77, segment: "Remote Commercial", highlights: ["Splunk"] },
          notes: [],
          status: "awaiting_review",
          nextAction: "Review",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      }
    };
    const packet = applicationPacketFromEnvelope(packetEnvelope);
    const list = applicationPacketsFromListEnvelope({ ok: true, data: { result: { applicationPackets: [packetEnvelope.data.result] } } });

    expect(packet?.id).toBe("packet-1");
    expect(packet?.selectedCompany?.name).toBe("ExampleCo");
    expect(list.length).toBe(1);
  });

  it("groups generated packets into the review lane and returns safety labels", () => {
    const packets = applicationPacketsFromListEnvelope({
      ok: true,
      data: {
        result: {
          applicationPackets: [
            { id: "packet-1", jobId: "job-1", selectedJob: { title: "SRE", company: "ExampleCo" }, fitScoreSummary: { score: 80, segment: "Remote Commercial", highlights: [] }, notes: [], status: "generated", nextAction: "Review" },
            { id: "packet-2", jobId: "job-2", selectedJob: { title: "PM", company: "ExampleCo" }, fitScoreSummary: { score: 20, segment: "Low Fit", highlights: [] }, notes: [], status: "submitted", nextAction: "Follow up" }
          ]
        }
      }
    });
    const groups = groupApplicationPacketsByStatus(packets);

    expect(groups.awaiting_review[0]?.id).toBe("packet-1");
    expect(groups.submitted[0]?.id).toBe("packet-2");
    expect(safetyLabelForPacket(groups.submitted[0]).includes("marked manually")).toBe(true);
  });

  it("builds create payload defaults from persisted jobs", () => {
    const payload = buildPacketPayloadDefaultsFromJob({
      id: "job-1",
      userId: "demo-user",
      companyId: "company-1",
      title: "Splunk Platform Engineer",
      company: { id: "company-1", name: "ExampleCo" },
      sources: [],
      segments: [{ segment: "Remote Commercial" }],
      fitScores: [{ score: 88 }],
      difficultyScores: []
    });

    expect(payload.jobId).toBe("job-1");
    expect(payload.companyId).toBe("company-1");
    expect(payload.fitScoreSummary.score).toBe(88);
    expect(payload.fitScoreSummary.highlights.includes("Remote Commercial")).toBe(true);
  });
});
