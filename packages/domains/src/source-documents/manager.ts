import { createHash } from "node:crypto";
import type { EventStore } from "@career-os/events";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import type { ProfileFactAllowedUse, ProfileFactCategory, ProfileFactTruthStatus } from "../profile-facts/manager";

export const SOURCE_DOCUMENTS_IMPORT_COMMAND = "source_documents.import";
export const SOURCE_DOCUMENTS_LIST_COMMAND = "source_documents.list";
export const SOURCE_DOCUMENTS_EXTRACT_CLAIMS_COMMAND = "source_documents.extract_claims";
export const SOURCE_DOCUMENTS_CURRENT_PROJECTION = "source_documents.current";
export const CAREER_CLAIM_CURRENT_PROJECTION = "career_claim.current";

export const SOURCE_DOCUMENT_IMPORT_STARTED_EVENT = "source_document.import_started";
export const SOURCE_DOCUMENT_IMPORTED_EVENT = "source_document.imported";
export const SOURCE_DOCUMENT_IMPORT_FAILED_EVENT = "source_document.import_failed";
export const SOURCE_DOCUMENT_CLAIM_EXTRACTION_STARTED_EVENT = "source_document.claim_extraction_started";
export const SOURCE_DOCUMENT_CLAIM_EXTRACTED_EVENT = "source_document.claim_extracted";
export const SOURCE_DOCUMENT_CLAIM_EXTRACTION_COMPLETED_EVENT = "source_document.claim_extraction_completed";
export const SOURCE_DOCUMENT_CLAIM_EXTRACTION_FAILED_EVENT = "source_document.claim_extraction_failed";

export type SourceDocumentType = "resume" | "cover_letter" | "performance_review" | "portfolio" | "job_history" | "other";
export type CareerClaimCategory = "employer" | "job_title" | "date" | "skill" | "tool" | "platform" | "project" | "achievement" | "certification" | "education" | "public_trust" | "clearance" | "industry_domain" | "work_preference";

export interface SourceDocument {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  documentType: SourceDocumentType;
  originalFilename?: string;
  contentText: string;
  sourceRef: string;
  checksum: string;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareerClaim {
  id: string;
  workspaceId: string;
  userId: string;
  sourceDocumentId: string;
  category: CareerClaimCategory;
  claim: string;
  normalizedClaim: string;
  evidenceText: string;
  confidence: number;
  suggestedTruthStatus: ProfileFactTruthStatus;
  suggestedAllowedUses: ProfileFactAllowedUse[];
  suggestedBlockedUses: ProfileFactAllowedUse[];
  riskFlags: string[];
  createdAt: string;
}

export interface SourceDocumentImportPayload {
  workspaceId?: string;
  title?: string;
  documentType?: SourceDocumentType;
  originalFilename?: string;
  contentText?: string;
  sourceRef?: string;
}

export interface SourceDocumentListPayload {
  workspaceId?: string;
}

export interface SourceDocumentExtractClaimsPayload {
  workspaceId?: string;
  sourceDocumentId?: string;
}

export interface SourceDocumentsProjection {
  documents: SourceDocument[];
  claims: CareerClaim[];
  updatedAt: string;
}

export const definition: DomainDefinition = {
  name: "Source Documents Domain",
  slug: "source-documents",
  manager: "SourceDocumentsManager",
  capabilities: ["SourceDocumentImportCapability", "CareerClaimExtractionCapability"],
  workers: ["SourceDocumentImportWorker", "CareerClaimExtractionWorker"],
  tools: ["PastedTextImportTool", "CareerClaimRegexExtractionTool"],
  commands: [SOURCE_DOCUMENTS_IMPORT_COMMAND, SOURCE_DOCUMENTS_LIST_COMMAND, SOURCE_DOCUMENTS_EXTRACT_CLAIMS_COMMAND],
  events: [
    SOURCE_DOCUMENT_IMPORT_STARTED_EVENT,
    SOURCE_DOCUMENT_IMPORTED_EVENT,
    SOURCE_DOCUMENT_IMPORT_FAILED_EVENT,
    SOURCE_DOCUMENT_CLAIM_EXTRACTION_STARTED_EVENT,
    SOURCE_DOCUMENT_CLAIM_EXTRACTED_EVENT,
    SOURCE_DOCUMENT_CLAIM_EXTRACTION_COMPLETED_EVENT,
    SOURCE_DOCUMENT_CLAIM_EXTRACTION_FAILED_EVENT
  ],
  permissions: [],
  dependencies: ["event-store", "state-store"],
  status: "partial",
  version: "0.1.0"
};

const allFormalUses: ProfileFactAllowedUse[] = ["resume", "cover_letter", "recruiter_email", "interview_prep", "career_strategy", "application_packet"];
const safeStrategyUses: ProfileFactAllowedUse[] = ["interview_prep", "career_strategy", "recruiter_email"];
const knownTools = ["AWS", "Azure", "GCP", "Terraform", "Kubernetes", "Docker", "Linux", "Splunk", "Cribl", "Datadog", "GitHub", "GitLab", "Jenkins", "Python", "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "SQL", "PostgreSQL", "Prisma", "Salesforce", "ServiceNow"];
const knownSkills = ["DevOps", "SRE", "observability", "SIEM", "detection engineering", "incident response", "security operations", "automation", "platform engineering", "cloud", "data analysis", "project management", "customer support", "technical writing", "stakeholder management"];
const knownCertifications = ["Splunk Enterprise Certified Administrator", "Splunk Enterprise Certified Architect", "CISSP", "Security+", "Network+", "AWS Certified", "Azure Fundamentals", "PMP", "CompTIA", "CKA", "CKAD"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function checksum(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function documentTypeFrom(value: unknown): SourceDocumentType {
  const text = stringFrom(value).toLowerCase();
  if (["resume", "cover_letter", "performance_review", "portfolio", "job_history", "other"].includes(text)) return text as SourceDocumentType;
  return "resume";
}

function claimId(sourceDocumentId: string, category: string, claim: string) {
  return `career_claim_${createHash("sha1").update(`${sourceDocumentId}:${category}:${claim.toLowerCase()}`).digest("hex").slice(0, 16)}`;
}

function buildClaim(input: Omit<CareerClaim, "id" | "normalizedClaim" | "createdAt">): CareerClaim {
  const now = new Date().toISOString();
  return {
    ...input,
    id: claimId(input.sourceDocumentId, input.category, input.claim),
    normalizedClaim: normalizeText(input.claim).toLowerCase(),
    createdAt: now
  };
}

function sentenceEvidence(contentText: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = contentText.match(new RegExp(`[^.\\n]*${escaped}[^.\\n]*`, "i"));
  return normalizeText(match?.[0] ?? token).slice(0, 500);
}

function defaultTruthFor(category: CareerClaimCategory): ProfileFactTruthStatus {
  if (["clearance", "public_trust"].includes(category)) return "needs_evidence";
  return "user_asserted";
}

function blockedUsesFor(category: CareerClaimCategory): ProfileFactAllowedUse[] {
  if (["clearance", "public_trust"].includes(category)) return ["resume", "application_packet"];
  return [];
}

function riskFlagsFor(category: CareerClaimCategory, claim: string): string[] {
  const lower = claim.toLowerCase();
  const flags: string[] = [];
  if (category === "public_trust") flags.push("public_trust_not_security_clearance");
  if (category === "clearance" && !lower.includes("public trust")) flags.push("clearance_requires_evidence");
  if (category === "certification") flags.push("certification_claim_sensitive");
  if (lower.includes("secret") || lower.includes("ts/sci") || lower.includes("polygraph") || lower.includes("clearance")) flags.push("clearance_claim_sensitive");
  if (category === "certification" || knownCertifications.some((certification) => lower.includes(certification.toLowerCase()))) flags.push("certification_claim_sensitive");
  return unique(flags);
}

function truthForExtractedClaim(category: CareerClaimCategory, riskFlags: string[]): ProfileFactTruthStatus {
  if (riskFlags.includes("clearance_claim_sensitive")) return "needs_evidence";
  return defaultTruthFor(category);
}

function blockedUsesForExtractedClaim(category: CareerClaimCategory, riskFlags: string[]): ProfileFactAllowedUse[] {
  if (riskFlags.includes("clearance_claim_sensitive")) return unique([...blockedUsesFor(category), "resume", "application_packet"]);
  return blockedUsesFor(category);
}

function isCertificationLine(line: string) {
  const lower = line.toLowerCase();
  return knownCertifications.some((certification) => lower.includes(certification.toLowerCase())) || /\bcertified\b/i.test(line);
}

function pushClaim(claims: CareerClaim[], doc: SourceDocument, category: CareerClaimCategory, claim: string, evidenceText: string, confidence = 0.72) {
  const clean = normalizeText(claim);
  if (!clean || clean.length < 2) return;
  const riskFlags = riskFlagsFor(category, clean);
  const suggestedTruthStatus = truthForExtractedClaim(category, riskFlags);
  const suggestedBlockedUses = blockedUsesForExtractedClaim(category, riskFlags);
  claims.push(buildClaim({
    workspaceId: doc.workspaceId,
    userId: doc.userId,
    sourceDocumentId: doc.id,
    category,
    claim: clean,
    evidenceText: evidenceText || clean,
    confidence,
    suggestedTruthStatus,
    suggestedAllowedUses: suggestedTruthStatus === "needs_evidence" ? safeStrategyUses : allFormalUses,
    suggestedBlockedUses,
    riskFlags
  }));
}

export class CareerClaimExtractionWorker {
  extract(document: SourceDocument): CareerClaim[] {
    const claims: CareerClaim[] = [];
    const text = document.contentText;
    const lines = text.split(/\r?\n/).map(normalizeText).filter(Boolean);

    for (const tool of knownTools) {
      if (new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
        pushClaim(claims, document, "tool", tool, sentenceEvidence(text, tool), 0.78);
      }
    }

    for (const skill of knownSkills) {
      if (new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
        pushClaim(claims, document, "skill", skill, sentenceEvidence(text, skill), 0.72);
      }
    }

    for (const cert of knownCertifications) {
      if (new RegExp(`\\b${cert.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text)) {
        pushClaim(claims, document, "certification", cert, sentenceEvidence(text, cert), 0.72);
      }
    }

    const publicTrustMatch = text.match(/public trust(?:\s+(?:eligible|clearance|position))?/i);
    if (publicTrustMatch) pushClaim(claims, document, "public_trust", publicTrustMatch[0], sentenceEvidence(text, publicTrustMatch[0]), 0.74);

    const clearanceMatch = text.match(/\b(?:secret|top secret|ts\/sci|polygraph)\b/i);
    if (clearanceMatch) pushClaim(claims, document, "clearance", clearanceMatch[0], sentenceEvidence(text, clearanceMatch[0]), 0.65);

    const educationMatch = text.match(/\b(?:B\.S\.|Bachelors?|M\.S\.|Masters?|MBA|PhD|degree)\b[^\n.]*/i);
    if (educationMatch) pushClaim(claims, document, "education", educationMatch[0], normalizeText(educationMatch[0]), 0.62);

    const achievementMatches = text.match(/[^\n.]*\b(?:increased|reduced|saved|improved|built|launched|led|managed|migrated|automated|cut|grew)\b[^\n.]*(?:\d+%|\$\d+|\d+x|\d+)?[^\n.]*/gi) ?? [];
    for (const achievement of achievementMatches.slice(0, 10)) pushClaim(claims, document, "achievement", achievement, normalizeText(achievement), 0.7);

    const dateMatches = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*(?:-|–|to)\s*(?:Present|Current|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi) ?? [];
    for (const date of dateMatches.slice(0, 8)) pushClaim(claims, document, "date", date, sentenceEvidence(text, date), 0.65);

    for (const line of lines.slice(0, 80)) {
      const titleMatch = line.match(/\b(?:engineer|developer|architect|analyst|manager|director|administrator|consultant|specialist|lead|sre|devops|security)\b/i);
      if (titleMatch && line.length <= 90 && !line.includes("@") && !isCertificationLine(line)) pushClaim(claims, document, "job_title", line, line, 0.55);

      const employerMatch = line.match(/^([A-Z][A-Za-z0-9&.,' -]{2,60})(?:\s+[|—-]\s+|,\s+)(?:.*(?:engineer|developer|architect|analyst|manager|director|administrator|consultant|specialist|lead|sre|devops|security))/i);
      if (employerMatch) pushClaim(claims, document, "employer", employerMatch[1], line, 0.58);

      if (/\b(?:healthcare|fintech|finance|defense|government|public sector|saas|ecommerce|education|telecom|cybersecurity)\b/i.test(line)) {
        pushClaim(claims, document, "industry_domain", line, line, 0.55);
      }

      if (/\b(?:remote|hybrid|onsite|relocation|contract|full.?time)\b/i.test(line) && /\b(?:prefer|open to|seeking|looking for|remote|hybrid)\b/i.test(line)) {
        pushClaim(claims, document, "work_preference", line, line, 0.6);
      }
    }

    const deduped = new Map<string, CareerClaim>();
    for (const claim of claims) deduped.set(`${claim.category}:${claim.normalizedClaim}`, claim);
    return [...deduped.values()];
  }
}

type SourceDocumentsContext = DomainExecutionContext & { eventStore: EventStore; stateStore: StateStore };

function isSourceDocument(value: unknown): value is SourceDocument {
  return isRecord(value) && typeof value.id === "string" && typeof value.contentText === "string";
}

function isCareerClaim(value: unknown): value is CareerClaim {
  return isRecord(value) && typeof value.id === "string" && typeof value.claim === "string" && typeof value.sourceDocumentId === "string";
}

async function loadProjection(context: SourceDocumentsContext, userId?: string): Promise<SourceDocumentsProjection> {
  const projection = await context.stateStore.getProjection("source_documents", userId ?? "default", SOURCE_DOCUMENTS_CURRENT_PROJECTION, userId ? { userId } : undefined);
  if (isRecord(projection?.data) && Array.isArray(projection.data.documents) && Array.isArray(projection.data.claims)) {
    return {
      documents: projection.data.documents.filter(isSourceDocument),
      claims: projection.data.claims.filter(isCareerClaim),
      updatedAt: stringFrom(projection.data.updatedAt) || new Date().toISOString()
    };
  }
  return { documents: [], claims: [], updatedAt: new Date().toISOString() };
}

async function saveProjection(context: SourceDocumentsContext, userId: string | undefined, data: SourceDocumentsProjection, sourceEventId?: string) {
  return context.stateStore.upsertProjection({
    userId,
    projectionType: SOURCE_DOCUMENTS_CURRENT_PROJECTION,
    entityType: "source_documents",
    entityId: userId ?? "default",
    sourceEventId,
    data,
    updatedAt: new Date(data.updatedAt)
  });
}

export class SourceDocumentsManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "SourceDocumentImportCapability",
      workers: ["SourceDocumentImportWorker"],
      commands: [SOURCE_DOCUMENTS_IMPORT_COMMAND, SOURCE_DOCUMENTS_LIST_COMMAND],
      events: [SOURCE_DOCUMENT_IMPORT_STARTED_EVENT, SOURCE_DOCUMENT_IMPORTED_EVENT, SOURCE_DOCUMENT_IMPORT_FAILED_EVENT],
      permissions: []
    },
    {
      name: "CareerClaimExtractionCapability",
      workers: ["CareerClaimExtractionWorker"],
      commands: [SOURCE_DOCUMENTS_EXTRACT_CLAIMS_COMMAND],
      events: [SOURCE_DOCUMENT_CLAIM_EXTRACTION_STARTED_EVENT, SOURCE_DOCUMENT_CLAIM_EXTRACTED_EVENT, SOURCE_DOCUMENT_CLAIM_EXTRACTION_COMPLETED_EVENT, SOURCE_DOCUMENT_CLAIM_EXTRACTION_FAILED_EVENT],
      permissions: []
    }
  ];

  constructor(private readonly extractionWorker = new CareerClaimExtractionWorker()) {}

  canHandle(command: CareerCommand) {
    return [SOURCE_DOCUMENTS_IMPORT_COMMAND, SOURCE_DOCUMENTS_LIST_COMMAND, SOURCE_DOCUMENTS_EXTRACT_CLAIMS_COMMAND].includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const executionContext = context as SourceDocumentsContext;
    if (command.type === SOURCE_DOCUMENTS_IMPORT_COMMAND) return this.handleImport(command as CareerCommand<SourceDocumentImportPayload>, executionContext);
    if (command.type === SOURCE_DOCUMENTS_LIST_COMMAND) return this.handleList(command as CareerCommand<SourceDocumentListPayload>, executionContext);
    if (command.type === SOURCE_DOCUMENTS_EXTRACT_CLAIMS_COMMAND) return this.handleExtractClaims(command as CareerCommand<SourceDocumentExtractClaimsPayload>, executionContext);
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleImport(command: CareerCommand<SourceDocumentImportPayload>, context: SourceDocumentsContext): Promise<CommandResult<{ document: SourceDocument }>> {
    const entityId = command.entityId ?? `source_document_${Date.now()}`;
    try {
      if (!command.userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Source document import requires a userId." } };
      const contentText = stringFrom(command.payload?.contentText).replace(/\r\n/g, "\n");
      if (contentText.length < 20) return { ok: false, status: "rejected", commandId: command.id, error: { code: "SOURCE_DOCUMENT_TEXT_REQUIRED", message: "Paste at least 20 characters of resume or career document text." } };

      await context.eventStore.append({ eventType: SOURCE_DOCUMENT_IMPORT_STARTED_EVENT, entityType: "source_document", entityId, domain: this.domainSlug, manager: definition.manager, capability: "SourceDocumentImportCapability", worker: "SourceDocumentImportWorker", userId: command.userId, payload: { commandId: command.id }, confidence: 1 });
      const now = new Date().toISOString();
      const document: SourceDocument = {
        id: entityId,
        workspaceId: stringFrom(command.payload?.workspaceId) || "default",
        userId: command.userId,
        title: stringFrom(command.payload?.title) || "Pasted career document",
        documentType: documentTypeFrom(command.payload?.documentType),
        originalFilename: stringFrom(command.payload?.originalFilename) || undefined,
        contentText,
        sourceRef: stringFrom(command.payload?.sourceRef) || `paste:${entityId}`,
        checksum: checksum(contentText),
        importedAt: now,
        createdAt: now,
        updatedAt: now
      };

      const importedEvent = await context.eventStore.append({ eventType: SOURCE_DOCUMENT_IMPORTED_EVENT, entityType: "source_document", entityId: document.id, domain: this.domainSlug, manager: definition.manager, capability: "SourceDocumentImportCapability", worker: "SourceDocumentImportWorker", userId: command.userId, payload: document, evidence: { inputMode: "paste_text", checksum: document.checksum }, confidence: 1 });
      const current = await loadProjection(context, command.userId);
      const documents = [...current.documents.filter((item) => item.id !== document.id), document];
      await saveProjection(context, command.userId, { documents, claims: current.claims, updatedAt: now }, importedEvent.id);
      return { ok: true, status: "completed", commandId: command.id, data: { document }, emittedEvents: [SOURCE_DOCUMENT_IMPORT_STARTED_EVENT, SOURCE_DOCUMENT_IMPORTED_EVENT], updatedProjections: [SOURCE_DOCUMENTS_CURRENT_PROJECTION] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown source document import failure";
      await context.eventStore.append({ eventType: SOURCE_DOCUMENT_IMPORT_FAILED_EVENT, entityType: "source_document", entityId, domain: this.domainSlug, manager: definition.manager, capability: "SourceDocumentImportCapability", worker: "SourceDocumentImportWorker", userId: command.userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "SOURCE_DOCUMENT_IMPORT_FAILED", message }, emittedEvents: [SOURCE_DOCUMENT_IMPORT_FAILED_EVENT] };
    }
  }

  private async handleList(command: CareerCommand<SourceDocumentListPayload>, context: SourceDocumentsContext): Promise<CommandResult<SourceDocumentsProjection>> {
    const data = await loadProjection(context, command.userId);
    return { ok: true, status: "completed", commandId: command.id, data, emittedEvents: [], updatedProjections: [] };
  }

  private async handleExtractClaims(command: CareerCommand<SourceDocumentExtractClaimsPayload>, context: SourceDocumentsContext): Promise<CommandResult<{ claims: CareerClaim[]; documentsProcessed: number }>> {
    const entityId = command.entityId ?? command.payload?.sourceDocumentId ?? command.userId ?? "source_documents";
    try {
      if (!command.userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Claim extraction requires a userId." } };
      const current = await loadProjection(context, command.userId);
      const docs = current.documents.filter((document) => !command.payload?.sourceDocumentId || document.id === command.payload.sourceDocumentId);
      if (docs.length === 0) return { ok: false, status: "rejected", commandId: command.id, error: { code: "SOURCE_DOCUMENT_NOT_FOUND", message: "No source document found for claim extraction." } };

      await context.eventStore.append({ eventType: SOURCE_DOCUMENT_CLAIM_EXTRACTION_STARTED_EVENT, entityType: "source_document", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerClaimExtractionCapability", worker: "CareerClaimExtractionWorker", userId: command.userId, payload: { commandId: command.id, documentCount: docs.length }, confidence: 1 });
      const extractedClaims: CareerClaim[] = [];
      const emittedEvents = [SOURCE_DOCUMENT_CLAIM_EXTRACTION_STARTED_EVENT];
      const processedDocumentIds = new Set(docs.map((document) => document.id));
      const staleClaimProjections = await context.stateStore.listByProjectionType(CAREER_CLAIM_CURRENT_PROJECTION, { userId: command.userId });
      for (const projection of staleClaimProjections) {
        const claim = projection.data;
        if (isCareerClaim(claim) && processedDocumentIds.has(claim.sourceDocumentId)) await context.stateStore.deleteProjection(projection.id);
      }

      for (const document of docs) {
        for (const claim of this.extractionWorker.extract(document)) {
          extractedClaims.push(claim);
          const event = await context.eventStore.append({ eventType: SOURCE_DOCUMENT_CLAIM_EXTRACTED_EVENT, entityType: "career_claim", entityId: claim.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerClaimExtractionCapability", worker: "CareerClaimExtractionWorker", userId: command.userId, payload: claim, evidence: { sourceDocumentId: document.id, evidenceText: claim.evidenceText }, confidence: claim.confidence });
          await context.stateStore.upsertProjection({ userId: command.userId, projectionType: CAREER_CLAIM_CURRENT_PROJECTION, entityType: "career_claim", entityId: claim.id, sourceEventId: event.id, data: claim, updatedAt: new Date(claim.createdAt) });
          emittedEvents.push(SOURCE_DOCUMENT_CLAIM_EXTRACTED_EVENT);
        }
      }

      const now = new Date().toISOString();
      const claimsById = new Map(current.claims.filter((claim) => !processedDocumentIds.has(claim.sourceDocumentId)).map((claim) => [claim.id, claim]));
      for (const claim of extractedClaims) claimsById.set(claim.id, claim);
      const currentClaimIds = new Set(claimsById.keys());
      for (const projection of await context.stateStore.listByProjectionType(CAREER_CLAIM_CURRENT_PROJECTION, { userId: command.userId })) {
        const claim = projection.data;
        if (isCareerClaim(claim) && processedDocumentIds.has(claim.sourceDocumentId) && !currentClaimIds.has(claim.id)) await context.stateStore.deleteProjection(projection.id);
      }
      const completedEvent = await context.eventStore.append({ eventType: SOURCE_DOCUMENT_CLAIM_EXTRACTION_COMPLETED_EVENT, entityType: "source_document", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerClaimExtractionCapability", worker: "CareerClaimExtractionWorker", userId: command.userId, payload: { commandId: command.id, extracted: extractedClaims.length, documentsProcessed: docs.length }, confidence: 1 });
      await saveProjection(context, command.userId, { documents: current.documents, claims: [...claimsById.values()], updatedAt: now }, completedEvent.id);
      emittedEvents.push(SOURCE_DOCUMENT_CLAIM_EXTRACTION_COMPLETED_EVENT);
      return { ok: true, status: "completed", commandId: command.id, data: { claims: extractedClaims, documentsProcessed: docs.length }, emittedEvents: unique(emittedEvents), updatedProjections: [SOURCE_DOCUMENTS_CURRENT_PROJECTION, CAREER_CLAIM_CURRENT_PROJECTION] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown claim extraction failure";
      await context.eventStore.append({ eventType: SOURCE_DOCUMENT_CLAIM_EXTRACTION_FAILED_EVENT, entityType: "source_document", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerClaimExtractionCapability", worker: "CareerClaimExtractionWorker", userId: command.userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "SOURCE_DOCUMENT_CLAIM_EXTRACTION_FAILED", message }, emittedEvents: [SOURCE_DOCUMENT_CLAIM_EXTRACTION_FAILED_EVENT], updatedProjections: [SOURCE_DOCUMENTS_CURRENT_PROJECTION] };
    }
  }
}
