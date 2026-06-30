import type { JobSegment, NormalizedJob } from "@career-os/shared";

export type ApplicationPacketStatus = "not_started" | "ready_to_generate" | "generated" | "awaiting_review" | "ready_to_apply" | "submitted" | "followup_due" | "closed";
export interface ApplicationPacketRecord { id: string; jobId: string; companyId?: string; personId?: string; selectedJob: NormalizedJob; selectedCompany?: { id?: string; name: string }; selectedPerson?: { id?: string; name: string; email?: string }; fitScoreSummary: { score: number; segment: JobSegment; highlights: string[] }; resumePlaceholder?: string; coverLetterPlaceholder?: string; recruiterMessagePlaceholder?: string; notes: string[]; status: ApplicationPacketStatus; nextAction: string; createdAt: string; updatedAt: string; }
export interface CreateApplicationPacketInput { jobId: string; companyId?: string; personId?: string; selectedJob: NormalizedJob; selectedCompany?: { id?: string; name: string }; selectedPerson?: { id?: string; name: string; email?: string }; fitScoreSummary: { score: number; segment: JobSegment; highlights?: string[] }; notes?: string[]; }

const packets = new Map<string, ApplicationPacketRecord>();

export function cacheApplicationPacket(packet: ApplicationPacketRecord) {
  packets.set(packet.id, packet);
  return packet;
}

export function buildApplicationPacket(input: CreateApplicationPacketInput): ApplicationPacketRecord {
  const now = new Date().toISOString();
  return { id: `packet_${Date.now()}`, jobId: input.jobId, companyId: input.companyId, personId: input.personId, selectedJob: input.selectedJob, selectedCompany: input.selectedCompany, selectedPerson: input.selectedPerson, fitScoreSummary: { ...input.fitScoreSummary, highlights: input.fitScoreSummary.highlights ?? [] }, notes: input.notes ?? [], status: "ready_to_generate", nextAction: "Generate resume, cover letter, and recruiter message drafts", createdAt: now, updatedAt: now };
}

export function createApplicationPacket(input: CreateApplicationPacketInput): ApplicationPacketRecord {
  return cacheApplicationPacket(buildApplicationPacket(input));
}

export function listApplicationPackets() { return [...packets.values()]; }
export function getApplicationPacket(id: string) { return packets.get(id); }

export function buildPacketPlaceholders(id: string, sourcePacket = packets.get(id)): ApplicationPacketRecord {
  if (!sourcePacket) throw new Error(`Application packet not found: ${id}`);
  return { ...sourcePacket, resumePlaceholder: `Technical resume draft for ${sourcePacket.selectedJob.title}; must be grounded in verified user profile facts before export.`, coverLetterPlaceholder: `Company-specific cover letter draft for ${sourcePacket.selectedCompany?.name ?? sourcePacket.selectedJob.company}; requires human review.`, recruiterMessagePlaceholder: sourcePacket.selectedPerson ? `Recruiter message draft for ${sourcePacket.selectedPerson.name}; approval required before sending.` : "Recruiter message draft; no recruiter selected yet.", status: "awaiting_review", nextAction: "Review generated drafts and approve edits before applying", updatedAt: new Date().toISOString() };
}

export function generatePacketPlaceholders(id: string, sourcePacket = packets.get(id)): ApplicationPacketRecord {
  return cacheApplicationPacket(buildPacketPlaceholders(id, sourcePacket));
}
