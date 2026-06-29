import { prisma as defaultPrisma } from "@career-os/db";

export type ProfileFactVerificationStatus = "verified" | "needs_review" | "unverified" | "blocked";
export type ProfileFactSourceType = "manual" | "resume_import" | "system_seed" | "email" | "job_history" | "document" | "unknown";

export interface ProfileFactInput {
  userId: string;
  factType: string;
  category?: string;
  label: string;
  value?: string;
  description?: string;
  source?: string;
  sourceType?: string;
  confidence?: number;
  verificationStatus?: string;
  allowedInResume?: boolean;
  allowedInCoverLetter?: boolean;
  allowedInRecruiterMessage?: boolean;
  requiresReview?: boolean;
  isBlocked?: boolean;
  blockedReason?: string;
  expiresAt?: Date | string;
}

export interface ProfileFactUpdateInput extends Partial<Omit<ProfileFactInput, "userId">> {
  id: string;
  userId?: string;
  archivedAt?: Date | string | null;
}

export interface ProfileFactRecord {
  id: string;
  userId: string;
  factType: string;
  category?: string;
  label: string;
  value?: string;
  description?: string;
  source?: string;
  sourceType: ProfileFactSourceType | string;
  confidence: number;
  verificationStatus: ProfileFactVerificationStatus | string;
  allowedInResume: boolean;
  allowedInCoverLetter: boolean;
  allowedInRecruiterMessage: boolean;
  requiresReview: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  expiresAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileFactsListInput {
  userId: string;
  status?: string;
  filter?: "all" | "verified" | "needs_review" | "blocked" | "resume_allowed";
}

export interface ProfileFactsStore {
  create(input: ProfileFactInput): Promise<ProfileFactRecord> | ProfileFactRecord;
  update(input: ProfileFactUpdateInput): Promise<ProfileFactRecord | undefined> | ProfileFactRecord | undefined;
  getById(id: string, currentUserId?: string): Promise<ProfileFactRecord | undefined> | ProfileFactRecord | undefined;
  list(input: ProfileFactsListInput): Promise<ProfileFactRecord[]> | ProfileFactRecord[];
  verify(id: string, currentUserId?: string): Promise<ProfileFactRecord | undefined> | ProfileFactRecord | undefined;
  block(input: { userId: string; id?: string; label?: string; factType?: string; blockedReason: string }): Promise<ProfileFactRecord | undefined> | ProfileFactRecord | undefined;
  archive(id: string, currentUserId?: string): Promise<ProfileFactRecord | undefined> | ProfileFactRecord | undefined;
  seedInitial(userId: string): Promise<{ facts: ProfileFactRecord[]; createdCount: number; skippedCount: number }> | { facts: ProfileFactRecord[]; createdCount: number; skippedCount: number };
}

type PrismaProfileFactLike = {
  profileFact?: {
    create(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
    upsert(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
  $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

export const INITIAL_VERIFIED_PROFILE_FACTS: ProfileFactInput[] = [
  ...[
    "Splunk",
    "Splunk Enterprise",
    "Splunk Cloud",
    "Cribl",
    "Cribl Stream",
    "SIEM",
    "log onboarding",
    "GDI",
    "props/transforms",
    "observability",
    "Linux",
    "Terraform",
    "AWS",
    "Azure",
    "GCP",
    "DevOps",
    "security data pipelines",
    "platform engineering",
    "infrastructure engineering",
    "SRE",
    "detection engineering"
  ].map((label) => verifiedSeed({ factType: label.includes("Splunk") || label.includes("Cribl") ? "tool" : "skill", category: categoryFor(label), label })),
  verifiedSeed({ factType: "certification", category: "certification", label: "Splunk Architect" }),
  verifiedSeed({ factType: "certification", category: "certification", label: "Cribl Admin" }),
  ...[
    "Splunk architecture",
    "log onboarding",
    "data normalization",
    "data optimization",
    "Cribl pipeline administration",
    "SIEM data routing",
    "cloud infrastructure support",
    "Linux systems",
    "DevOps workflows",
    "Terraform infrastructure",
    "security observability"
  ].map((label) => verifiedSeed({ factType: "experience_theme", category: categoryFor(label), label }))
];

export const INITIAL_BLOCKED_PROFILE_FACTS: ProfileFactInput[] = [
  blockedSeed({ factType: "certification", category: "blocked_claim", label: "CISSP", blockedReason: "User does not have this certification." }),
  blockedSeed({ factType: "certification", category: "blocked_claim", label: "Security+", blockedReason: "User does not have this certification." }),
  blockedSeed({ factType: "clearance", category: "blocked_claim", label: "active clearance", blockedReason: "User does not have verified active clearance." }),
  blockedSeed({ factType: "clearance", category: "blocked_claim", label: "Secret clearance", blockedReason: "User does not have verified Secret clearance." }),
  blockedSeed({ factType: "clearance", category: "blocked_claim", label: "Top Secret clearance", blockedReason: "User does not have verified Top Secret clearance." }),
  blockedSeed({ factType: "clearance", category: "blocked_claim", label: "TS/SCI", blockedReason: "User does not have verified TS/SCI clearance." }),
  blockedSeed({ factType: "clearance", category: "blocked_claim", label: "Public Trust", blockedReason: "User does not have verified Public Trust clearance." }),
  blockedSeed({ factType: "clearance", category: "blocked_claim", label: "Polygraph", blockedReason: "User does not have verified polygraph status." })
];

export const INITIAL_PROFILE_FACTS = [...INITIAL_VERIFIED_PROFILE_FACTS, ...INITIAL_BLOCKED_PROFILE_FACTS];

function categoryFor(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("splunk")) return "splunk";
  if (lower.includes("cribl")) return "cribl";
  if (lower.includes("siem") || lower.includes("detection") || lower.includes("security")) return "security";
  if (lower.includes("terraform")) return "terraform";
  if (lower.includes("aws") || lower.includes("azure") || lower.includes("gcp") || lower.includes("cloud")) return "cloud";
  if (lower.includes("linux")) return "linux";
  if (lower.includes("observability")) return "observability";
  if (lower.includes("infrastructure")) return "infrastructure";
  return "devops";
}

function verifiedSeed(input: Pick<ProfileFactInput, "factType" | "category" | "label">): ProfileFactInput {
  return {
    userId: "",
    ...input,
    value: input.label,
    source: "Career OS system seed",
    sourceType: "system_seed",
    confidence: 1,
    verificationStatus: "verified",
    allowedInResume: true,
    allowedInCoverLetter: true,
    allowedInRecruiterMessage: true,
    requiresReview: false,
    isBlocked: false
  };
}

function blockedSeed(input: Pick<ProfileFactInput, "factType" | "category" | "label" | "blockedReason">): ProfileFactInput {
  return {
    userId: "",
    ...input,
    value: input.label,
    source: "Career OS system seed",
    sourceType: "system_seed",
    confidence: 1,
    verificationStatus: "blocked",
    allowedInResume: false,
    allowedInCoverLetter: false,
    allowedInRecruiterMessage: false,
    requiresReview: false,
    isBlocked: true
  };
}

function createProfileFactId() {
  return `profile_fact_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned || undefined;
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeStatus(input: ProfileFactInput) {
  if (input.isBlocked) return "blocked";
  const status = cleanString(input.verificationStatus);
  if (status === "verified" || status === "unverified" || status === "blocked") return status;
  return "needs_review";
}

function normalizeSourceType(value: unknown) {
  const sourceType = cleanString(value);
  if (["manual", "resume_import", "system_seed", "email", "job_history", "document", "unknown"].includes(sourceType)) return sourceType;
  return "unknown";
}

function normalizeInput(input: ProfileFactInput, id = createProfileFactId(), existing?: ProfileFactRecord): ProfileFactRecord {
  const now = new Date();
  const isBlocked = input.isBlocked === true || normalizeStatus(input) === "blocked";
  return {
    id,
    userId: cleanString(input.userId),
    factType: cleanString(input.factType),
    category: optionalString(input.category),
    label: cleanString(input.label),
    value: optionalString(input.value) ?? cleanString(input.label),
    description: optionalString(input.description),
    source: optionalString(input.source),
    sourceType: normalizeSourceType(input.sourceType),
    confidence: typeof input.confidence === "number" ? input.confidence : 1,
    verificationStatus: isBlocked ? "blocked" : normalizeStatus(input),
    allowedInResume: isBlocked ? false : input.allowedInResume ?? false,
    allowedInCoverLetter: isBlocked ? false : input.allowedInCoverLetter ?? false,
    allowedInRecruiterMessage: isBlocked ? false : input.allowedInRecruiterMessage ?? false,
    requiresReview: isBlocked ? false : input.requiresReview ?? normalizeStatus(input) !== "verified",
    isBlocked,
    blockedReason: optionalString(input.blockedReason),
    expiresAt: normalizeDate(input.expiresAt),
    archivedAt: existing?.archivedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function definedUpdate(input: ProfileFactUpdateInput) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as ProfileFactUpdateInput;
}

function applyUpdate(existing: ProfileFactRecord, input: ProfileFactUpdateInput): ProfileFactRecord {
  const cleaned = definedUpdate(input);
  const merged: ProfileFactInput = { ...existing, ...cleaned, userId: cleaned.userId ?? existing.userId };
  return { ...normalizeInput(merged, existing.id, existing), archivedAt: cleaned.archivedAt === null ? undefined : normalizeDate(cleaned.archivedAt) ?? existing.archivedAt };
}

function toRecord(row: unknown): ProfileFactRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as ProfileFactRecord;
  return {
    ...record,
    category: record.category ?? undefined,
    value: record.value ?? undefined,
    description: record.description ?? undefined,
    source: record.source ?? undefined,
    blockedReason: record.blockedReason ?? undefined,
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined,
    archivedAt: record.archivedAt ? new Date(record.archivedAt) : undefined,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  };
}

function toRecords(rows: unknown[]) {
  return rows.map(toRecord).filter((row): row is ProfileFactRecord => Boolean(row));
}

function assertValidInput(input: ProfileFactInput) {
  if (!cleanString(input.userId)) throw new Error("userId is required for profile facts.");
  if (!cleanString(input.factType)) throw new Error("factType is required for profile facts.");
  if (!cleanString(input.label)) throw new Error("label is required for profile facts.");
}

function matchesListFilter(fact: ProfileFactRecord, input: ProfileFactsListInput) {
  if (fact.userId !== input.userId || fact.archivedAt) return false;
  const filter = input.filter ?? "all";
  if (input.status && fact.verificationStatus !== input.status) return false;
  if (filter === "verified") return fact.verificationStatus === "verified";
  if (filter === "needs_review") return fact.verificationStatus === "needs_review" || fact.requiresReview;
  if (filter === "blocked") return fact.isBlocked || fact.verificationStatus === "blocked";
  if (filter === "resume_allowed") return isResumeAllowedProfileFact(fact);
  return true;
}

export function isResumeAllowedProfileFact(fact: ProfileFactRecord, now = new Date()) {
  return fact.verificationStatus === "verified" && fact.allowedInResume && !fact.isBlocked && !fact.requiresReview && !fact.archivedAt && (!fact.expiresAt || fact.expiresAt > now);
}

export function profileFactResumeText(fact: ProfileFactRecord) {
  return fact.value || fact.description || fact.label;
}

function normalizedClaimText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ").replace(/\s+/g, " ").trim();
}

export function selectBlockedClaimLabels(facts: ProfileFactRecord[]) {
  return facts.filter((fact) => fact.isBlocked || fact.verificationStatus === "blocked").map((fact) => fact.label);
}

function blockedClaimLabelSet(facts: ProfileFactRecord[]) {
  return new Set(selectBlockedClaimLabels(facts).map(normalizedClaimText));
}

export function isShadowedByBlockedClaim(fact: ProfileFactRecord, blockedClaimLabels: Set<string>) {
  return !(fact.isBlocked || fact.verificationStatus === "blocked") && blockedClaimLabels.has(normalizedClaimText(fact.label));
}

export function selectEffectiveProfileFacts(facts: ProfileFactRecord[]) {
  const blockedLabels = blockedClaimLabelSet(facts);
  return facts.filter((fact) => !isShadowedByBlockedClaim(fact, blockedLabels));
}

export function selectResumeAllowedProfileFacts(facts: ProfileFactRecord[]) {
  const blockedLabels = blockedClaimLabelSet(facts);
  return facts.filter((fact) => isResumeAllowedProfileFact(fact) && !isShadowedByBlockedClaim(fact, blockedLabels));
}

export function selectResumeAllowedFacts(facts: ProfileFactRecord[]) {
  return selectResumeAllowedProfileFacts(facts).map(profileFactResumeText);
}

export class InMemoryProfileFactsStore implements ProfileFactsStore {
  private facts = new Map<string, ProfileFactRecord>();

  create(input: ProfileFactInput) {
    assertValidInput(input);
    const existing = [...this.facts.values()].find((fact) => fact.userId === input.userId && fact.factType === input.factType && fact.label.toLowerCase() === input.label.trim().toLowerCase());
    const saved = normalizeInput(input, existing?.id, existing);
    if (existing?.isBlocked && !saved.isBlocked) return existing;
    this.facts.set(saved.id, saved);
    return saved;
  }

  update(input: ProfileFactUpdateInput) {
    const existing = this.facts.get(input.id);
    if (!existing || (input.userId && existing.userId !== input.userId)) return undefined;
    const updated = applyUpdate(existing, input);
    this.facts.set(updated.id, updated);
    return updated;
  }

  getById(id: string, currentUserId?: string) {
    const fact = this.facts.get(id);
    if (!fact || (currentUserId && fact.userId !== currentUserId)) return undefined;
    return fact;
  }

  list(input: ProfileFactsListInput) {
    const facts = [...this.facts.values()].filter((fact) => matchesListFilter(fact, { ...input, filter: input.filter === "resume_allowed" ? "all" : input.filter })).sort((a, b) => a.label.localeCompare(b.label));
    if (input.filter === "resume_allowed") return selectResumeAllowedProfileFacts(facts);
    return selectEffectiveProfileFacts(facts);
  }

  verify(id: string, currentUserId?: string) {
    return this.update({ id, userId: currentUserId, verificationStatus: "verified", allowedInResume: true, allowedInCoverLetter: true, allowedInRecruiterMessage: true, requiresReview: false, isBlocked: false });
  }

  block(input: { userId: string; id?: string; label?: string; factType?: string; blockedReason: string }) {
    const existing = input.id ? this.getById(input.id, input.userId) : [...this.facts.values()].find((fact) => fact.userId === input.userId && fact.label.toLowerCase() === cleanString(input.label).toLowerCase() && (!input.factType || fact.factType === input.factType));
    if (existing) return this.update({ id: existing.id, userId: input.userId, verificationStatus: "blocked", allowedInResume: false, allowedInCoverLetter: false, allowedInRecruiterMessage: false, requiresReview: false, isBlocked: true, blockedReason: input.blockedReason });
    if (!input.label) return undefined;
    return this.create({ userId: input.userId, factType: input.factType ?? "blocked_claim", category: "blocked_claim", label: input.label, value: input.label, sourceType: "manual", verificationStatus: "blocked", allowedInResume: false, allowedInCoverLetter: false, allowedInRecruiterMessage: false, requiresReview: false, isBlocked: true, blockedReason: input.blockedReason });
  }

  archive(id: string, currentUserId?: string) {
    return this.update({ id, userId: currentUserId, archivedAt: new Date() });
  }

  seedInitial(userId: string) {
    const seeded: ProfileFactRecord[] = [];
    let createdCount = 0;
    let skippedCount = 0;
    for (const seed of INITIAL_PROFILE_FACTS) {
      const existing = [...this.facts.values()].find((fact) => fact.userId === userId && fact.factType === seed.factType && fact.label.toLowerCase() === seed.label.toLowerCase());
      if (existing) {
        seeded.push(existing);
        skippedCount += 1;
      } else {
        seeded.push(this.create({ ...seed, userId }));
        createdCount += 1;
      }
    }
    return { facts: seeded, createdCount, skippedCount };
  }

  clear() {
    this.facts.clear();
  }
}

export class PrismaProfileFactsStore implements ProfileFactsStore {
  constructor(private readonly client: PrismaProfileFactLike = defaultPrisma as unknown as PrismaProfileFactLike) {}

  async create(input: ProfileFactInput) {
    assertValidInput(input);
    const normalized = normalizeInput(input);
    const existing = await this.findByIdentity(normalized.userId, normalized.label, normalized.factType);
    if (existing?.isBlocked && !normalized.isBlocked) return existing;
    const row = this.client.profileFact
      ? await this.client.profileFact.upsert({
        where: { userId_label_factType: { userId: normalized.userId, label: normalized.label, factType: normalized.factType } },
        create: toPrismaData(normalized),
        update: toPrismaData({ ...normalized, id: undefined as unknown as string })
      })
      : await this.rawUpsert(normalized);
    const record = toRecord(row);
    if (!record) throw new Error("Failed to create profile fact.");
    return record;
  }

  async update(input: ProfileFactUpdateInput) {
    const existing = await this.getById(input.id, input.userId);
    if (!existing) return undefined;
    const updated = applyUpdate(existing, input);
    const row = this.client.profileFact
      ? await this.client.profileFact.update({ where: { id: input.id }, data: toPrismaData({ ...updated, id: undefined as unknown as string }) })
      : await this.rawUpdate(updated);
    return toRecord(row);
  }

  async getById(id: string, currentUserId?: string) {
    const row = this.client.profileFact ? await this.client.profileFact.findUnique({ where: { id } }) : await this.rawFindFirst("WHERE id = $1", [id]);
    const fact = toRecord(row);
    if (!fact || (currentUserId && fact.userId !== currentUserId)) return undefined;
    return fact;
  }

  async list(input: ProfileFactsListInput) {
    const rows = this.client.profileFact
      ? await this.client.profileFact.findMany({ where: { userId: input.userId, archivedAt: null }, orderBy: { label: "asc" } })
      : await this.rawFindMany('WHERE "userId" = $1 AND "archivedAt" IS NULL ORDER BY label ASC', [input.userId]);
    const facts = toRecords(rows).filter((fact) => matchesListFilter(fact, { ...input, filter: input.filter === "resume_allowed" ? "all" : input.filter }));
    if (input.filter === "resume_allowed") return selectResumeAllowedProfileFacts(facts);
    return selectEffectiveProfileFacts(facts);
  }

  async verify(id: string, currentUserId?: string) {
    return this.update({ id, userId: currentUserId, verificationStatus: "verified", allowedInResume: true, allowedInCoverLetter: true, allowedInRecruiterMessage: true, requiresReview: false, isBlocked: false });
  }

  async block(input: { userId: string; id?: string; label?: string; factType?: string; blockedReason: string }) {
    const existing = input.id ? await this.getById(input.id, input.userId) : await this.findByIdentity(input.userId, input.label, input.factType);
    if (existing) return this.update({ id: existing.id, userId: input.userId, verificationStatus: "blocked", allowedInResume: false, allowedInCoverLetter: false, allowedInRecruiterMessage: false, requiresReview: false, isBlocked: true, blockedReason: input.blockedReason });
    if (!input.label) return undefined;
    return this.create({ userId: input.userId, factType: input.factType ?? "blocked_claim", category: "blocked_claim", label: input.label, value: input.label, sourceType: "manual", verificationStatus: "blocked", allowedInResume: false, allowedInCoverLetter: false, allowedInRecruiterMessage: false, requiresReview: false, isBlocked: true, blockedReason: input.blockedReason });
  }

  archive(id: string, currentUserId?: string) {
    return this.update({ id, userId: currentUserId, archivedAt: new Date() });
  }

  async seedInitial(userId: string) {
    const facts: ProfileFactRecord[] = [];
    let createdCount = 0;
    let skippedCount = 0;
    for (const seed of INITIAL_PROFILE_FACTS) {
      const existing = await this.findByIdentity(userId, seed.label, seed.factType);
      if (existing) {
        facts.push(existing);
        skippedCount += 1;
      } else {
        facts.push(await this.create({ ...seed, userId }));
        createdCount += 1;
      }
    }
    return { facts, createdCount, skippedCount };
  }

  private async findByIdentity(userId: string, label?: string, factType?: string) {
    if (!label) return undefined;
    if (this.client.profileFact) return toRecord(await this.client.profileFact.findFirst({ where: { userId, label, factType } }));
    const clauses = ['"userId" = $1', "label = $2"];
    const values: unknown[] = [userId, label];
    if (factType) {
      clauses.push('"factType" = $3');
      values.push(factType);
    }
    return toRecord(await this.rawFindFirst(`WHERE ${clauses.join(" AND ")}`, values));
  }

  private async rawFindFirst(whereClause: string, values: unknown[]) {
    const rows = await this.rawFindMany(`${whereClause} LIMIT 1`, values);
    return rows[0];
  }

  private async rawFindMany(whereClause: string, values: unknown[]) {
    if (!this.client.$queryRawUnsafe) throw new Error("PROFILE_FACTS_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose profileFact or raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "ProfileFact" ${whereClause}`, ...values);
  }

  private rawUpsert(record: ProfileFactRecord) {
    if (!this.client.$queryRawUnsafe) throw new Error("PROFILE_FACTS_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose profileFact or raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`INSERT INTO "ProfileFact" (id, "userId", "factType", category, label, value, description, source, "sourceType", confidence, "verificationStatus", "allowedInResume", "allowedInCoverLetter", "allowedInRecruiterMessage", "requiresReview", "isBlocked", "blockedReason", "expiresAt", "archivedAt", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT ("userId", label, "factType") DO UPDATE SET category = EXCLUDED.category, value = EXCLUDED.value, description = EXCLUDED.description, source = EXCLUDED.source, "sourceType" = EXCLUDED."sourceType", confidence = EXCLUDED.confidence, "verificationStatus" = EXCLUDED."verificationStatus", "allowedInResume" = EXCLUDED."allowedInResume", "allowedInCoverLetter" = EXCLUDED."allowedInCoverLetter", "allowedInRecruiterMessage" = EXCLUDED."allowedInRecruiterMessage", "requiresReview" = EXCLUDED."requiresReview", "isBlocked" = EXCLUDED."isBlocked", "blockedReason" = EXCLUDED."blockedReason", "expiresAt" = EXCLUDED."expiresAt", "archivedAt" = EXCLUDED."archivedAt", "updatedAt" = EXCLUDED."updatedAt"
      RETURNING *`, ...profileFactSqlValues(record)).then((rows) => rows[0]);
  }

  private rawUpdate(record: ProfileFactRecord) {
    if (!this.client.$queryRawUnsafe) throw new Error("PROFILE_FACTS_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose profileFact or raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`UPDATE "ProfileFact" SET "userId" = $2, "factType" = $3, category = $4, label = $5, value = $6, description = $7, source = $8, "sourceType" = $9, confidence = $10, "verificationStatus" = $11, "allowedInResume" = $12, "allowedInCoverLetter" = $13, "allowedInRecruiterMessage" = $14, "requiresReview" = $15, "isBlocked" = $16, "blockedReason" = $17, "expiresAt" = $18, "archivedAt" = $19, "createdAt" = $20, "updatedAt" = $21 WHERE id = $1 RETURNING *`, ...profileFactSqlValues(record)).then((rows) => rows[0]);
  }
}

function profileFactSqlValues(record: ProfileFactRecord) {
  return [
    record.id,
    record.userId,
    record.factType,
    record.category,
    record.label,
    record.value,
    record.description,
    record.source,
    record.sourceType,
    record.confidence,
    record.verificationStatus,
    record.allowedInResume,
    record.allowedInCoverLetter,
    record.allowedInRecruiterMessage,
    record.requiresReview,
    record.isBlocked,
    record.blockedReason,
    record.expiresAt,
    record.archivedAt,
    record.createdAt,
    record.updatedAt
  ];
}

function toPrismaData(record: ProfileFactRecord) {
  const data = {
    id: record.id,
    userId: record.userId,
    factType: record.factType,
    category: record.category,
    label: record.label,
    value: record.value,
    description: record.description,
    source: record.source,
    sourceType: record.sourceType,
    confidence: record.confidence,
    verificationStatus: record.verificationStatus,
    allowedInResume: record.allowedInResume,
    allowedInCoverLetter: record.allowedInCoverLetter,
    allowedInRecruiterMessage: record.allowedInRecruiterMessage,
    requiresReview: record.requiresReview,
    isBlocked: record.isBlocked,
    blockedReason: record.blockedReason,
    expiresAt: record.expiresAt,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
  if (!data.id) delete (data as { id?: string }).id;
  return data;
}

export const profileFactsStore = new InMemoryProfileFactsStore();
export const prismaProfileFactsStore = new PrismaProfileFactsStore();
