import type { ApplicationPacketRecord } from "@career-os/domains";

export interface PacketResumePayload {
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  verifiedFacts: string[];
  targetRole: string;
  companyName: string;
  jobDescription?: string;
  targetKeywords: string[];
}

export interface PacketResumeResultView {
  commandId?: string;
  commandStatus?: string;
  draftId?: string;
  resumeVersionId?: string;
  guardOk?: boolean;
  sourceSnapshotId?: string;
  usedFactCount?: number;
  blockedClaimCount?: number;
  needsEvidenceExclusionCount?: number;
  truthfulnessNotes: string[];
  warnings: string[];
  errorMessage?: string;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function parseVerifiedFacts(value: string) {
  return uniqueStrings(value.split(/\r?\n/).map((line) => line.replace(/^[-*•]\s*/, "")));
}

export function buildPacketResumePayload(packet: ApplicationPacketRecord, _verifiedFactsText = ""): PacketResumePayload {
  const highlights = packet.fitScoreSummary.highlights ?? [];
  const targetKeywords = uniqueStrings([
    packet.selectedJob.title,
    packet.fitScoreSummary.segment,
    ...highlights.flatMap((highlight) => highlight.split(/[,.:;|]/))
  ]).slice(0, 20);

  return {
    jobId: packet.jobId,
    companyId: packet.companyId ?? packet.selectedCompany?.id ?? packet.selectedCompany?.name ?? packet.selectedJob.company,
    applicationPacketId: packet.id,
    verifiedFacts: [],
    targetRole: packet.selectedJob.title,
    companyName: packet.selectedCompany?.name ?? packet.selectedJob.company,
    jobDescription: packet.selectedJob.description,
    targetKeywords
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function packetResumeResultFromEnvelope(value: unknown): PacketResumeResultView {
  if (!isRecord(value)) return { truthfulnessNotes: [], warnings: [], errorMessage: "Invalid resume response." };
  if (value.ok === false) {
    const error = isRecord(value.error) ? value.error : {};
    return { truthfulnessNotes: [], warnings: [], errorMessage: typeof error.message === "string" ? error.message : "Resume generation failed." };
  }

  const data = isRecord(value.data) ? value.data : {};
  const result = isRecord(data.result) ? data.result : {};
  const draft = isRecord(result.draft) ? result.draft : {};
  const guard = isRecord(result.guard) ? result.guard : {};
  const summary = isRecord(result.truthfulnessSummary) ? result.truthfulnessSummary : {};
  return {
    commandId: typeof data.commandId === "string" ? data.commandId : undefined,
    commandStatus: typeof data.status === "string" ? data.status : undefined,
    draftId: typeof draft.id === "string" ? draft.id : undefined,
    resumeVersionId: typeof draft.resumeVersionId === "string" ? draft.resumeVersionId : undefined,
    guardOk: typeof guard.ok === "boolean" ? guard.ok : undefined,
    sourceSnapshotId: typeof result.sourceSnapshotId === "string" ? result.sourceSnapshotId : undefined,
    usedFactCount: typeof summary.usedFactCount === "number" ? summary.usedFactCount : undefined,
    blockedClaimCount: typeof summary.blockedClaimCount === "number" ? summary.blockedClaimCount : undefined,
    needsEvidenceExclusionCount: typeof summary.needsEvidenceExclusionCount === "number" ? summary.needsEvidenceExclusionCount : undefined,
    truthfulnessNotes: stringList(summary.notes),
    warnings: stringList(result.warnings)
  };
}
