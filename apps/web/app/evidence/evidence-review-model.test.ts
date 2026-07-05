import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEvidenceReview } from "./evidence-review-model";

const pageSource = readFileSync(join(process.cwd(), "apps/web/app/evidence/evidence-panel.tsx"), "utf8");

describe("Evidence Review model", () => {
  it("groups documents, claims, resume-ready facts, blocked facts, and missing evidence", () => {
    const review = buildEvidenceReview({
      sourceDocuments: {
        documents: [
          { id: "doc-1", title: "Greg Resume", documentType: "resume", originalFilename: "greg-resume.pdf", importedAt: "2026-07-04T10:00:00.000Z", contentText: "Built Splunk dashboards and automation." }
        ],
        claims: [
          { id: "claim-1", claim: "Built Splunk dashboards", category: "achievement", evidenceText: "Built Splunk dashboards and automation.", confidence: 0.82 }
        ]
      },
      claims: [
        { id: "claim-1", claim: "Duplicate claim", category: "achievement", evidenceText: "Duplicate", confidence: 0.5 }
      ],
      profileFacts: [
        { id: "fact-1", claim: "Splunk", category: "tool", truthStatus: "user_asserted", evidenceSummary: "Appears in resume", allowedUses: ["resume", "cover_letter"], blockedUses: [] },
        { id: "fact-2", claim: "CISSP", category: "certification", truthStatus: "needs_evidence", evidenceSummary: "Mentioned in resume", allowedUses: ["interview_prep"], blockedUses: ["resume", "application_packet"] },
        { id: "fact-3", claim: "Top Secret", category: "clearance", truthStatus: "blocked", evidenceSummary: "Sensitive", allowedUses: [], blockedUses: ["resume", "cover_letter", "application_packet"] }
      ],
      careerProfile: { missingEvidence: ["Certification verification"] },
      packets: [{ id: "packet-1", missingEvidence: ["Project metric proof"] }]
    });

    expect(review.counts).toEqual({ documents: 1, extractedClaims: 1, profileFacts: 3, resumeAllowedFacts: 1, blockedPrivateFacts: 2, missingEvidence: 3 });
    expect(review.resumeAllowedFacts.map((fact) => fact.claim)).toEqual(["Splunk"]);
    expect(review.blockedPrivateFacts.map((fact) => fact.claim)).toEqual(["CISSP", "Top Secret"]);
    expect(review.missingEvidence.map((item) => item.item)).toEqual(["CISSP", "Certification verification", "Project metric proof"]);
    expect(review.profileFacts.map((fact) => fact.status)).toContain("From your resume");
    expect(review.blockedPrivateFacts[0].reason).toBe("Needs proof before resume use.");
  });

  it("keeps the page read-only and uses user-facing labels", () => {
    expect(pageSource.includes("Evidence Review")).toBe(true);
    expect(pageSource.includes("Read-only")).toBe(true);
    expect(pageSource.includes("Imported documents")).toBe(true);
    expect(pageSource.includes("Extracted claims")).toBe(true);
    expect(pageSource.includes("Saved facts")).toBe(true);
    expect(pageSource.includes("Resume-ready facts")).toBe(true);
    expect(pageSource.includes("Kept out of resumes")).toBe(true);
    expect(pageSource.includes("Missing evidence")).toBe(true);
    expect(pageSource.includes("truthStatus")).toBe(false);
    expect(pageSource.includes("allowedUses")).toBe(false);
    expect(pageSource.includes("blockedUses")).toBe(false);
    expect(pageSource.includes("projection")).toBe(false);
  });
});
