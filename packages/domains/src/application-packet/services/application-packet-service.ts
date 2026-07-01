import type { JobSegment, NormalizedJob } from "@career-os/shared";

export type ApplicationPacketStatus = "not_started" | "ready_to_generate" | "generated" | "awaiting_review" | "ready_to_apply" | "submitted" | "followup_due" | "closed";
export interface ApplicationPacketRecord { id: string; jobId: string; companyId?: string; personId?: string; selectedJob: NormalizedJob; selectedCompany?: { id?: string; name: string }; selectedPerson?: { id?: string; name: string; email?: string }; fitScoreSummary: { score: number; segment: JobSegment; highlights: string[] }; resumePlaceholder?: string; coverLetterPlaceholder?: string; recruiterMessagePlaceholder?: string; notes: string[]; status: ApplicationPacketStatus; nextAction: string; createdAt: string; updatedAt: string; }
export interface CreateApplicationPacketInput { jobId: string; companyId?: string; personId?: string; selectedJob: NormalizedJob; selectedCompany?: { id?: string; name: string }; selectedPerson?: { id?: string; name: string; email?: string }; fitScoreSummary: { score: number; segment: JobSegment; highlights?: string[] }; notes?: string[]; }
export interface UpdateApplicationPacketStatusInput { packet: ApplicationPacketRecord; status: ApplicationPacketStatus; note?: string; }

const packets = new Map<string, ApplicationPacketRecord>();

const allowedStatusTransitions: Record<ApplicationPacketStatus, ApplicationPacketStatus[]> = {
  not_started: ["closed"],
  ready_to_generate: ["awaiting_review", "closed"],
  generated: ["awaiting_review", "closed"],
  awaiting_review: ["ready_to_apply", "closed"],
  ready_to_apply: ["followup_due", "closed"],
  submitted: ["followup_due"],
  followup_due: ["closed"],
  closed: []
};

const nextActionByStatus: Record<ApplicationPacketStatus, string> = {
  not_started: "Create an application packet",
  ready_to_generate: "Generate grounded resume and review packet materials",
  generated: "Review generated drafts before marking ready",
  awaiting_review: "Review grounded drafts and confirm this packet is ready to apply manually",
  ready_to_apply: "Apply manually outside Career OS, then set follow-up due when appropriate",
  submitted: "Track submission externally and schedule follow-up",
  followup_due: "Follow up manually or close the packet",
  closed: "No further action"
};

export function assertApplicationPacketStatusTransition(from: ApplicationPacketStatus, to: ApplicationPacketStatus) {
  if (!allowedStatusTransitions[from]?.includes(to)) {
    throw new Error(`Invalid packet status transition from ${from} to ${to}.`);
  }
}

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

export function buildApplicationPacketStatusUpdate(input: UpdateApplicationPacketStatusInput): ApplicationPacketRecord {
  assertApplicationPacketStatusTransition(input.packet.status, input.status);
  return {
    ...input.packet,
    status: input.status,
    notes: input.note ? [...input.packet.notes, input.note] : input.packet.notes,
    nextAction: nextActionByStatus[input.status],
    updatedAt: new Date().toISOString()
  };
}

export function updateApplicationPacketStatus(id: string, status: ApplicationPacketStatus, note?: string, sourcePacket = packets.get(id)): ApplicationPacketRecord {
  if (!sourcePacket) throw new Error(`Application packet not found: ${id}`);
  return cacheApplicationPacket(buildApplicationPacketStatusUpdate({ packet: sourcePacket, status, note }));
}
