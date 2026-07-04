import { describe, expect, it } from "vitest";
import { BLOCKED_DEMO_KEYWORDS, SAFETY_WARNINGS, buildKeywordAlignment, buildResumeDemoPayload, resumeResultFromEnvelope, uniqueStrings } from "./resume-demo-panel-model";

describe("resume demo panel model", () => {
  it("builds the default Splunk/Cribl demo payload without unsupported claims", () => {
    const payload = buildResumeDemoPayload();
    const facts = payload.verifiedFacts.join(" ");

    expect(payload.targetRole).toBe("Splunk / Cribl Platform Engineer");
    expect(payload.companyName).toBe("Demo Commercial Company");
    expect(payload.jobDescription.includes("CISSP and Security+ preferred")).toBe(true);
    expect(facts.includes("Splunk")).toBe(true);
    expect(facts.includes("Cribl")).toBe(true);
    expect(facts.includes("CISSP")).toBe(false);
    expect(facts.includes("Security+")).toBe(false);
    expect(facts.includes("Top Secret")).toBe(false);
  });

  it("formats keyword alignment with verified, missing, and blocked keywords", () => {
    const payload = buildResumeDemoPayload();
    const alignment = buildKeywordAlignment(payload);

    expect(["Splunk", "Cribl", "SIEM", "Linux", "Terraform", "AWS", "Azure", "GCP"].every((keyword) => alignment.verifiedMatches.includes(keyword))).toBe(true);
    expect(["CISSP", "Security+"].every((keyword) => alignment.missingKeywords.includes(keyword))).toBe(true);
    expect(["active clearance", "Top Secret", "TS/SCI"].every((keyword) => alignment.blockedKeywords.includes(keyword))).toBe(true);
  });

  it("deduplicates display strings before rendering repeated warnings or claims", () => {
    expect(uniqueStrings(["Human review required", "Human review required", "  Grounded claim  "]).join("|"))
      .toBe("Human review required|Grounded claim");
  });

  it("preserves safety warnings required by the demo page", () => {
    expect(SAFETY_WARNINGS.join("|")).toBe("This resume is a draft for local review only.|Career OS did not email, upload, submit, or apply to anything.|Verify employer history, dates, and metrics before using externally.");
    expect(BLOCKED_DEMO_KEYWORDS.includes("fake employer history")).toBe(true);
  });

  it("extracts resume API success envelopes for display", () => {
    const result = resumeResultFromEnvelope({
      ok: true,
      data: {
        commandId: "command-1",
        status: "completed",
        result: {
          reviewRequired: true,
          sourceSnapshotId: "snapshot-1",
          draft: {
            id: "resume_draft_1",
            jobId: "job-1",
            companyId: "company-1",
            applicationPacketId: "packet-1",
            reviewRequired: true,
            sections: [{ title: "Most relevant verified facts", bullets: ["Built Splunk SIEM dashboards."] }],
            content: "Review required\n\n## Most relevant verified facts\n- Built Splunk SIEM dashboards.",
            sourceFacts: ["Built Splunk SIEM dashboards."],
            targetKeywords: ["splunk"],
            matchedFactCount: 1,
            unmatchedFactCount: 0,
            warnings: ["Human review required."]
          },
          guard: { ok: true, blockedClaims: [], groundedClaims: ["Built Splunk SIEM dashboards."], placeholderClaims: ["[Add verified employer]"], warnings: [] },
          truthfulnessSummary: {
            generatedFromProfileFacts: true,
            profileFactsLoaded: 3,
            usedFactCount: 1,
            blockedClaimCount: 1,
            needsEvidenceExclusionCount: 1,
            missingRequiredFacts: ["verified employer"],
            notes: ["Resume Factory used profile_facts.current as the source of truth."]
          },
          generatedFromProfileFacts: true,
          usedFactIds: ["fact-used"],
          blockedFactIds: ["fact-blocked"],
          needsEvidenceFactIds: ["fact-needs-evidence"],
          warnings: ["Human review required."]
        }
      }
    });

    expect(result.commandId).toBe("command-1");
    expect(result.commandStatus).toBe("completed");
    expect(result.draft?.id).toBe("resume_draft_1");
    expect(result.guard?.ok).toBe(true);
    expect(result.guard?.placeholderClaims[0]).toBe("[Add verified employer]");
    expect(result.generatedFromProfileFacts).toBe(true);
    expect(result.usedFactIds.join("|")).toBe("fact-used");
    expect(result.blockedFactIds.join("|")).toBe("fact-blocked");
    expect(result.needsEvidenceFactIds.join("|")).toBe("fact-needs-evidence");
    expect(result.truthfulnessSummary?.usedFactCount).toBe(1);
    expect(result.truthfulnessSummary?.blockedClaimCount).toBe(1);
    expect(result.truthfulnessSummary?.needsEvidenceExclusionCount).toBe(1);
    expect(result.truthfulnessSummary?.missingRequiredFacts.join("|")).toBe("verified employer");
  });

  it("extracts resume API failure envelopes for display", () => {
    const result = resumeResultFromEnvelope({
      ok: false,
      error: { code: "INVALID_RESUME_REQUEST", message: "Invalid resume generation request." },
      command: { id: "command-2", status: "rejected" }
    });

    expect(result.commandStatus).toBe("rejected");
    expect(result.errorCode).toBe("INVALID_RESUME_REQUEST");
    expect(result.errorMessage).toBe("Invalid resume generation request.");
    expect(result.usedFactIds.length).toBe(0);
    expect(result.blockedFactIds.length).toBe(0);
    expect(result.needsEvidenceFactIds.length).toBe(0);
  });

  it("surfaces truthfulness-blocked claims from failure envelopes", () => {
    const result = resumeResultFromEnvelope({
      ok: false,
      error: {
        code: "UNSUPPORTED_RESUME_CLAIMS_BLOCKED",
        message: "Resume draft contains claims not grounded in verifiedFacts.",
        details: { blockedClaims: ["Held active Top Secret clearance."] }
      },
      command: { id: "command-3", status: "rejected" }
    });
    const alignment = buildKeywordAlignment(buildResumeDemoPayload(), result);

    expect(result.guard?.ok).toBe(false);
    expect(result.guard?.blockedClaims[0]).toBe("Held active Top Secret clearance.");
    expect(result.guard?.placeholderClaims.length).toBe(0);
    expect(alignment.blockedKeywords.includes("Blocked claim: Held active Top Secret clearance.")).toBe(true);
  });
});
