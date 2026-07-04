export interface UploadedResumeReviewInput {
  importedDocumentCount: number;
  profileBuilt: boolean;
  missingEvidence: string[];
  claimsToAvoid: string[];
  companiesExcludedFromSearch: string[];
  ignoredResumeLinesForSearch: string[];
  certificationsUsedAsSearchKeywords: string[];
}

export function buildUploadedResumeFinalReview(input: UploadedResumeReviewInput) {
  if (input.importedDocumentCount === 0) return ["Upload and import a resume before final review."];
  if (!input.profileBuilt) return ["Build Career Profile to complete uploaded-resume final review."];

  const findings = [
    ...input.missingEvidence.map((item) => `Needs evidence before completion: ${item}`),
    ...input.claimsToAvoid.map((item) => `Do not use until corrected or verified: ${item}`),
    ...input.companiesExcludedFromSearch.map((item) => `Company name preserved as resume context, not used as a job-search term: ${item}`),
    ...input.certificationsUsedAsSearchKeywords.map((item) => `Certification preserved as a usable search keyword: ${item}`),
    ...input.ignoredResumeLinesForSearch.slice(0, 8).map((item) => `Resume line reviewed but not used as a search query: ${item}`)
  ];

  return findings.length > 0 ? findings : ["No uploaded-resume review findings found yet."];
}
