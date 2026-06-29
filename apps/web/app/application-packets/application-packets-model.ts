import { fitScoreForJob, segmentForJob, type PersistedJobView } from "../jobs/jobs-panel-model";

export type ApplicationPacketStatus = "not_started" | "ready_to_generate" | "generated" | "awaiting_review" | "ready_to_apply" | "submitted" | "followup_due" | "closed";

export const APPLICATION_PACKET_STATUSES: ApplicationPacketStatus[] = [
  "ready_to_generate",
  "awaiting_review",
  "ready_to_apply",
  "submitted",
  "followup_due",
  "closed"
];

export const APPLICATION_PACKET_STATUS_LABELS: Record<ApplicationPacketStatus, string> = {
  not_started: "Not started",
  ready_to_generate: "Ready to generate",
  generated: "Generated",
  awaiting_review: "Awaiting review",
  ready_to_apply: "Ready to apply manually",
  submitted: "Submitted manually",
  followup_due: "Follow-up due",
  closed: "Closed"
};

export interface ApplicationPacketView {
  id: string;
  userId?: string;
  applicationId?: string;
  jobId: string;
  companyId?: string;
  personId?: string;
  selectedJob: {
    title: string;
    company: string;
    location?: string;
    description?: string;
    url?: string;
  };
  selectedCompany?: {
    id?: string;
    name: string;
  };
  selectedPerson?: {
    id?: string;
    name: string;
    email?: string;
  };
  fitScoreSummary: {
    score: number;
    segment: string;
    highlights: string[];
  };
  resumePlaceholder?: string;
  coverLetterPlaceholder?: string;
  recruiterMessagePlaceholder?: string;
  notes: string[];
  status: ApplicationPacketStatus;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePacketFormFields {
  jobId: string;
}

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function asStatus(value: unknown): ApplicationPacketStatus {
  const status = asString(value);
  return ["not_started", "ready_to_generate", "generated", "awaiting_review", "ready_to_apply", "submitted", "followup_due", "closed"].includes(status) ? status as ApplicationPacketStatus : "not_started";
}

function dataResult(envelope: unknown) {
  if (!isRecord(envelope) || envelope.ok !== true || !isRecord(envelope.data)) return undefined;
  return isRecord(envelope.data.result) ? envelope.data.result : envelope.data;
}

function normalizeSelectedJob(value: unknown) {
  const job = isRecord(value) ? value : {};
  return {
    title: asString(job.title, "Untitled role"),
    company: asString(job.company, "Unknown company"),
    location: asOptionalString(job.location),
    description: asOptionalString(job.description),
    url: asOptionalString(job.url)
  };
}

function normalizeParty(value: unknown) {
  if (!isRecord(value)) return undefined;
  const name = asOptionalString(value.name);
  if (!name) return undefined;
  return { id: asOptionalString(value.id), name, email: asOptionalString(value.email) };
}

function normalizeFitScoreSummary(value: unknown) {
  const summary = isRecord(value) ? value : {};
  return {
    score: asNumber(summary.score),
    segment: asString(summary.segment, "Unknown Clearance Risk"),
    highlights: asStringArray(summary.highlights)
  };
}

export function normalizeApplicationPacket(value: unknown): ApplicationPacketView | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id);
  const jobId = asString(value.jobId);
  if (!id || !jobId) return undefined;
  const selectedJob = normalizeSelectedJob(value.selectedJob);
  return {
    id,
    userId: asOptionalString(value.userId),
    applicationId: asOptionalString(value.applicationId),
    jobId,
    companyId: asOptionalString(value.companyId),
    personId: asOptionalString(value.personId),
    selectedJob,
    selectedCompany: normalizeParty(value.selectedCompany) ?? { id: asOptionalString(value.companyId), name: selectedJob.company },
    selectedPerson: normalizeParty(value.selectedPerson),
    fitScoreSummary: normalizeFitScoreSummary(value.fitScoreSummary),
    resumePlaceholder: asOptionalString(value.resumePlaceholder),
    coverLetterPlaceholder: asOptionalString(value.coverLetterPlaceholder),
    recruiterMessagePlaceholder: asOptionalString(value.recruiterMessagePlaceholder),
    notes: asStringArray(value.notes),
    status: asStatus(value.status),
    nextAction: asString(value.nextAction, nextActionLabel(asStatus(value.status))),
    createdAt: asString(value.createdAt),
    updatedAt: asString(value.updatedAt)
  };
}

export function applicationPacketFromEnvelope(envelope: unknown) {
  return normalizeApplicationPacket(dataResult(envelope));
}

export function applicationPacketsFromListEnvelope(envelope: unknown): ApplicationPacketView[] {
  const result = dataResult(envelope);
  const packets = isRecord(result) && Array.isArray(result.applicationPackets) ? result.applicationPackets : [];
  return packets.map(normalizeApplicationPacket).filter((packet): packet is ApplicationPacketView => Boolean(packet));
}

export function groupApplicationPacketsByStatus(packets: ApplicationPacketView[]) {
  return packets.reduce<Record<ApplicationPacketStatus, ApplicationPacketView[]>>((groups, packet) => {
    const status = packet.status === "generated" ? "awaiting_review" : packet.status;
    return { ...groups, [status]: [...(groups[status] ?? []), packet] };
  }, {
    not_started: [],
    ready_to_generate: [],
    generated: [],
    awaiting_review: [],
    ready_to_apply: [],
    submitted: [],
    followup_due: [],
    closed: []
  });
}

export function nextActionLabel(status: ApplicationPacketStatus) {
  switch (status) {
    case "not_started":
      return "Create a packet from a saved job.";
    case "ready_to_generate":
      return "Generate local drafts for review.";
    case "generated":
    case "awaiting_review":
      return "Review drafts against verified facts.";
    case "ready_to_apply":
      return "Apply manually on the employer site.";
    case "submitted":
      return "Track manual follow-up.";
    case "followup_due":
      return "Write a human-reviewed follow-up.";
    case "closed":
      return "No next action.";
  }
}

export function safetyLabelForPacket(packet: ApplicationPacketView) {
  if (packet.status === "submitted") return "Submitted status was marked manually; no external submit event was sent.";
  return "Manual-safe: no auto-submit, email send, upload, scraping, or browser automation.";
}

export function buildPacketPayloadDefaultsFromJob(job: PersistedJobView) {
  return {
    jobId: job.id,
    companyId: job.companyId,
    selectedCompany: job.company?.name ? { id: job.companyId, name: job.company.name } : undefined,
    fitScoreSummary: {
      score: fitScoreForJob(job),
      segment: segmentForJob(job),
      highlights: [segmentForJob(job), `${fitScoreForJob(job)}/100 fit score`]
    }
  };
}

export function defaultCreatePacketFormFields(): CreatePacketFormFields {
  return { jobId: "" };
}
