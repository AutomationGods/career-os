import { prisma as defaultPrisma } from "@career-os/db";
import type { ProfileFactInput } from "./profile-facts-service";

export const MASTER_RESUME_PARSE_VERSION = "master-resume-parser-v1";
export const MASTER_RESUME_DEFAULT_SOURCE = "pasted_plain_text";

export interface MasterResumeImportInput {
  userId: string;
  resumeText: string;
  source?: string;
  importedAt?: Date | string;
}

export interface ParsedMasterResumeFact extends Omit<ProfileFactInput, "userId"> {
  evidence: string;
  normalizedLabel: string;
}

export interface MasterResumeContent {
  rawText: string;
  source: string;
  importedAt: string;
  parseVersion: string;
  candidateFacts: ParsedMasterResumeFact[];
  stats: {
    rawTextLength: number;
    candidateFactCount: number;
  };
}

export interface MasterResumeRecord {
  id: string;
  userId: string;
  content: MasterResumeContent;
}

export interface MasterResumeStore {
  importResume(input: MasterResumeImportInput): Promise<MasterResumeRecord> | MasterResumeRecord;
  getCurrent(userId: string): Promise<MasterResumeRecord | undefined> | MasterResumeRecord | undefined;
}

type PrismaMasterResumeLike = {
  masterResume?: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
  $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

type CandidateRule = {
  label: string;
  factType: string;
  category: string;
  aliases?: string[];
  confidence: number;
};

const candidateRules: CandidateRule[] = [
  { label: "Splunk", factType: "tool", category: "splunk", aliases: ["splunk enterprise", "splunk cloud"], confidence: 0.95 },
  { label: "Splunk Enterprise", factType: "tool", category: "splunk", confidence: 0.92 },
  { label: "Splunk Cloud", factType: "tool", category: "splunk", confidence: 0.92 },
  { label: "Cribl", factType: "tool", category: "cribl", aliases: ["cribl stream"], confidence: 0.95 },
  { label: "Cribl Stream", factType: "tool", category: "cribl", confidence: 0.92 },
  { label: "SIEM", factType: "skill", category: "security", aliases: ["security information and event management"], confidence: 0.9 },
  { label: "log onboarding", factType: "experience_theme", category: "security", aliases: ["data onboarding", "log ingestion"], confidence: 0.88 },
  { label: "GDI", factType: "skill", category: "splunk", aliases: ["getting data in"], confidence: 0.86 },
  { label: "props/transforms", factType: "skill", category: "splunk", aliases: ["props.conf", "transforms.conf"], confidence: 0.86 },
  { label: "observability", factType: "skill", category: "observability", confidence: 0.86 },
  { label: "Linux", factType: "skill", category: "linux", confidence: 0.9 },
  { label: "Terraform", factType: "skill", category: "terraform", confidence: 0.9 },
  { label: "AWS", factType: "skill", category: "cloud", aliases: ["amazon web services"], confidence: 0.9 },
  { label: "Azure", factType: "skill", category: "cloud", confidence: 0.9 },
  { label: "GCP", factType: "skill", category: "cloud", aliases: ["google cloud"], confidence: 0.9 },
  { label: "DevOps", factType: "skill", category: "devops", confidence: 0.86 },
  { label: "security data pipelines", factType: "experience_theme", category: "security", confidence: 0.88 },
  { label: "platform engineering", factType: "experience_theme", category: "infrastructure", confidence: 0.84 },
  { label: "infrastructure engineering", factType: "experience_theme", category: "infrastructure", confidence: 0.84 },
  { label: "SRE", factType: "skill", category: "infrastructure", aliases: ["site reliability"], confidence: 0.84 },
  { label: "detection engineering", factType: "experience_theme", category: "security", confidence: 0.84 },
  { label: "Splunk Architect", factType: "certification", category: "certification", confidence: 0.8 },
  { label: "Cribl Admin", factType: "certification", category: "certification", confidence: 0.8 },
  { label: "CISSP", factType: "certification", category: "certification", confidence: 0.72 },
  { label: "Security+", factType: "certification", category: "certification", aliases: ["security plus"], confidence: 0.72 },
  { label: "active clearance", factType: "clearance", category: "clearance", confidence: 0.7 },
  { label: "Secret clearance", factType: "clearance", category: "clearance", aliases: ["secret cleared"], confidence: 0.7 },
  { label: "Top Secret clearance", factType: "clearance", category: "clearance", aliases: ["top secret", "ts clearance"], confidence: 0.7 },
  { label: "TS/SCI", factType: "clearance", category: "clearance", aliases: ["ts sci", "tssci"], confidence: 0.7 },
  { label: "Public Trust", factType: "clearance", category: "clearance", confidence: 0.7 },
  { label: "Polygraph", factType: "clearance", category: "clearance", aliases: ["poly"], confidence: 0.7 }
];

function createMasterResumeId() {
  return `master_resume_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function importedAtString(value: Date | string | undefined) {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeClaimText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string) {
  return normalizeClaimText(value).replace(/\+/g, " plus ").replace(/\//g, " ").replace(/\s+/g, " ").trim();
}

function containsPhrase(text: string, phrase: string) {
  const normalizedText = ` ${normalizeForMatch(text)} `;
  const normalizedPhrase = normalizeForMatch(phrase);
  return normalizedPhrase.length > 0 && normalizedText.includes(` ${normalizedPhrase} `);
}

function evidenceSnippet(resumeText: string, rule: CandidateRule) {
  const terms = [rule.label, ...(rule.aliases ?? [])];
  const lines = resumeText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => terms.some((term) => containsPhrase(line, term))) ?? rule.label;
}

function toCandidateFact(rule: CandidateRule, evidence: string): ParsedMasterResumeFact {
  return {
    factType: rule.factType,
    category: rule.category,
    label: rule.label,
    value: rule.label,
    description: `Candidate fact parsed from master resume evidence: ${evidence}`,
    source: "Master Resume Import",
    sourceType: "resume_import",
    confidence: rule.confidence,
    verificationStatus: "needs_review",
    allowedInResume: false,
    allowedInCoverLetter: false,
    allowedInRecruiterMessage: false,
    requiresReview: true,
    isBlocked: false,
    evidence,
    normalizedLabel: normalizeClaimText(rule.label)
  };
}

export function parseMasterResumeText(resumeText: string): ParsedMasterResumeFact[] {
  const text = cleanString(resumeText);
  if (!text) return [];

  const facts = new Map<string, ParsedMasterResumeFact>();
  for (const rule of candidateRules) {
    const terms = [rule.label, ...(rule.aliases ?? [])];
    if (!terms.some((term) => containsPhrase(text, term))) continue;
    const key = `${rule.factType}:${normalizeClaimText(rule.label)}`;
    if (!facts.has(key)) facts.set(key, toCandidateFact(rule, evidenceSnippet(text, rule)));
  }

  return [...facts.values()].sort((a, b) => `${a.factType}:${a.label}`.localeCompare(`${b.factType}:${b.label}`));
}

function buildContent(input: MasterResumeImportInput): MasterResumeContent {
  const rawText = cleanString(input.resumeText);
  const candidateFacts = parseMasterResumeText(rawText);
  return {
    rawText,
    source: cleanString(input.source) || MASTER_RESUME_DEFAULT_SOURCE,
    importedAt: importedAtString(input.importedAt),
    parseVersion: MASTER_RESUME_PARSE_VERSION,
    candidateFacts,
    stats: {
      rawTextLength: rawText.length,
      candidateFactCount: candidateFacts.length
    }
  };
}

function parseJsonValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function normalizeRecord(row: unknown): MasterResumeRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as { id?: unknown; userId?: unknown; content?: unknown };
  const id = cleanString(record.id);
  const userId = cleanString(record.userId);
  const contentValue = parseJsonValue(record.content);
  if (!id || !userId || !contentValue || typeof contentValue !== "object") return undefined;
  const content = contentValue as MasterResumeContent;
  return { id, userId, content };
}

function normalizeRecords(rows: unknown[]) {
  return rows.map(normalizeRecord).filter((row): row is MasterResumeRecord => Boolean(row));
}

function sortByImportedAtDesc(records: MasterResumeRecord[]) {
  return [...records].sort((a, b) => new Date(b.content.importedAt).getTime() - new Date(a.content.importedAt).getTime());
}

export class InMemoryMasterResumeStore implements MasterResumeStore {
  private resumes = new Map<string, MasterResumeRecord>();

  importResume(input: MasterResumeImportInput) {
    const userId = cleanString(input.userId);
    if (!userId) throw new Error("userId is required to import a master resume.");
    const record = {
      id: createMasterResumeId(),
      userId,
      content: buildContent(input)
    };
    this.resumes.set(record.id, record);
    return record;
  }

  getCurrent(userId: string) {
    return sortByImportedAtDesc([...this.resumes.values()].filter((resume) => resume.userId === userId))[0];
  }

  clear() {
    this.resumes.clear();
  }
}

export class PrismaMasterResumeStore implements MasterResumeStore {
  constructor(private readonly client: PrismaMasterResumeLike = defaultPrisma as unknown as PrismaMasterResumeLike) {}

  async importResume(input: MasterResumeImportInput) {
    const userId = cleanString(input.userId);
    if (!userId) throw new Error("userId is required to import a master resume.");
    const record = {
      id: createMasterResumeId(),
      userId,
      content: buildContent(input)
    };
    const row = this.client.masterResume
      ? await this.client.masterResume.create({ data: record })
      : await this.rawCreate(record);
    const saved = normalizeRecord(row);
    if (!saved) throw new Error("Failed to import master resume.");
    return saved;
  }

  async getCurrent(userId: string) {
    const rows = this.client.masterResume
      ? await this.client.masterResume.findMany({ where: { userId } })
      : await this.rawFindMany(userId);
    return sortByImportedAtDesc(normalizeRecords(rows))[0];
  }

  private rawCreate(record: MasterResumeRecord) {
    if (!this.client.$queryRawUnsafe) throw new Error("MASTER_RESUME_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose masterResume or raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`INSERT INTO "MasterResume" (id, "userId", content) VALUES ($1, $2, $3::jsonb) RETURNING *`, record.id, record.userId, JSON.stringify(record.content)).then((rows) => rows[0]);
  }

  private rawFindMany(userId: string) {
    if (!this.client.$queryRawUnsafe) throw new Error("MASTER_RESUME_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose masterResume or raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "MasterResume" WHERE "userId" = $1`, userId);
  }
}

export const masterResumeStore = new InMemoryMasterResumeStore();
export const prismaMasterResumeStore = new PrismaMasterResumeStore();
