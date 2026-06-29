import type { JobSegment, NormalizedJob } from "@career-os/shared";
import {
  applicationPacketStore,
  createApplicationPacketId,
  nextActionForStatus,
  type ApplicationPacketDraftFields,
  type ApplicationPacketRecord,
  type ApplicationPacketStatus,
  type ApplicationPacketStore,
  type CreateApplicationPacketInput,
  type ApplicationPacketListFilter
} from "./application-packet-store";

export type {
  ApplicationPacketDraftFields,
  ApplicationPacketFitScoreSummary,
  ApplicationPacketListFilter,
  ApplicationPacketParty,
  ApplicationPacketRecord,
  ApplicationPacketStatus,
  ApplicationPacketStore,
  CreateApplicationPacketInput
} from "./application-packet-store";

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function companyNameFor(packet: Pick<ApplicationPacketRecord, "selectedCompany" | "selectedJob">) {
  return packet.selectedCompany?.name ?? packet.selectedJob.company ?? "the company";
}

function summaryHighlights(summary: { highlights?: string[]; segment: JobSegment; score: number }) {
  const highlights = uniqueStrings(summary.highlights ?? []);
  if (highlights.length > 0) return highlights.slice(0, 4);
  return [`${summary.segment} segment`, `${summary.score}/100 fit score`];
}

function sentenceList(values: string[]) {
  if (values.length === 0) return "the verified requirements in the saved job";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

export function buildApplicationPacket(input: CreateApplicationPacketInput): ApplicationPacketRecord {
  const now = new Date().toISOString();
  const selectedCompany = input.selectedCompany ?? { id: input.companyId, name: input.selectedJob.company };
  return {
    id: input.id ?? createApplicationPacketId(input.jobId),
    userId: input.userId,
    jobId: input.jobId,
    companyId: input.companyId ?? selectedCompany.id,
    personId: input.personId,
    selectedJob: input.selectedJob,
    selectedCompany,
    selectedPerson: input.selectedPerson,
    fitScoreSummary: {
      score: input.fitScoreSummary.score,
      segment: input.fitScoreSummary.segment,
      highlights: summaryHighlights(input.fitScoreSummary)
    },
    notes: input.notes ?? [],
    status: "ready_to_generate",
    nextAction: nextActionForStatus("ready_to_generate"),
    createdAt: now,
    updatedAt: now
  };
}

export function buildPacketDraftFields(packet: ApplicationPacketRecord): ApplicationPacketDraftFields {
  const company = companyNameFor(packet);
  const title = packet.selectedJob.title || "the role";
  const highlights = summaryHighlights(packet.fitScoreSummary);
  const highlightText = sentenceList(highlights);
  const sourceUrl = packet.selectedJob.url ? `\nSource URL for human review: ${packet.selectedJob.url}` : "";
  const verifiedFactsWarning = "Review required: use verified Profile Facts only. Do not claim certifications, clearance, employment dates, titles, tools, metrics, or work authorization unless they are already verified.";

  return {
    resumePlaceholder: [
      `Resume draft brief for ${title} at ${company}.`,
      `Prioritize verified facts that match ${highlightText}.`,
      "Keep every bullet grounded in the Profile Facts store before export.",
      verifiedFactsWarning,
      sourceUrl.trim()
    ].filter(Boolean).join("\n"),
    coverLetterPlaceholder: [
      `Hello ${company} team,`,
      "",
      `I’m interested in the ${title} role because the saved job aligns with ${highlightText}.`,
      "I can bring relevant experience only where my verified Profile Facts support the claim; I will remove any unsupported certification, clearance, metric, or tool claim before sending.",
      "Thank you for reviewing my application. I’d welcome the chance to discuss how my verified background maps to this role.",
      "",
      verifiedFactsWarning
    ].join("\n"),
    recruiterMessagePlaceholder: packet.selectedPerson
      ? [
        `Hi ${packet.selectedPerson.name},`,
        `I’m reviewing the ${title} opening at ${company}. The strongest saved matches are ${highlightText}.`,
        "If you are the right contact, I’d appreciate any guidance on the team’s priorities. I’ll only send a resume after verifying every claim against my Profile Facts.",
        verifiedFactsWarning
      ].join("\n")
      : [
        `Hi ${company} recruiting team,`,
        `I’m reviewing the ${title} opening. The strongest saved matches are ${highlightText}.`,
        "I’d appreciate any guidance on the team’s priorities. I’ll only send a resume after verifying every claim against my Profile Facts.",
        verifiedFactsWarning
      ].join("\n"),
    status: "awaiting_review",
    nextAction: nextActionForStatus("awaiting_review")
  };
}

export function createApplicationPacket(input: CreateApplicationPacketInput, store: ApplicationPacketStore = applicationPacketStore) {
  return store.create(buildApplicationPacket(input));
}

export function listApplicationPackets(filter: ApplicationPacketListFilter = {}, store: ApplicationPacketStore = applicationPacketStore) {
  return store.list(filter);
}

export function getApplicationPacket(id: string, store: ApplicationPacketStore = applicationPacketStore, currentUserId?: string) {
  return store.getById(id, currentUserId);
}

export async function generatePacketPlaceholders(id: string, store: ApplicationPacketStore = applicationPacketStore, currentUserId?: string) {
  const packet = await store.getById(id, currentUserId);
  if (!packet) throw new Error(`Application packet not found: ${id}`);
  return store.updateDraftFields(id, buildPacketDraftFields(packet), currentUserId);
}

export function updateApplicationPacketStatus(id: string, status: ApplicationPacketStatus, store: ApplicationPacketStore = applicationPacketStore, nextAction = nextActionForStatus(status), currentUserId?: string) {
  return store.updateStatus(id, status, nextAction, currentUserId);
}

export function normalizedJobFromPersistedJob(job: {
  id: string;
  title: string;
  company?: { name?: string };
  location?: string;
  description?: string;
  url?: string;
  employmentType?: string;
  source?: string;
}): NormalizedJob {
  return {
    title: job.title,
    company: job.company?.name ?? "Unknown company",
    location: job.location,
    description: job.description,
    url: job.url,
    employmentType: job.employmentType,
    source: job.source ?? "persisted",
    raw: { jobId: job.id }
  };
}
