import { prisma as defaultPrisma } from "@career-os/db";

type Delegate = {
  findUnique?: (args: unknown) => Promise<unknown>;
  findMany?: (args?: unknown) => Promise<unknown[]>;
  delete?: (args: unknown) => Promise<unknown>;
  deleteMany?: (args?: unknown) => Promise<unknown>;
};

type PrivacyPrismaClient = Record<string, Delegate | unknown>;

export const PRIVACY_DELETE_CONFIRMATION = "DELETE_MY_CAREER_OS_DATA";

function delegate(client: PrivacyPrismaClient, name: string): Delegate | undefined {
  const value = client[name];
  return value && typeof value === "object" ? value as Delegate : undefined;
}

async function findMany(client: PrivacyPrismaClient, name: string, args?: unknown) {
  const model = delegate(client, name);
  return model?.findMany ? model.findMany(args) : [];
}

async function findUnique(client: PrivacyPrismaClient, name: string, args: unknown) {
  const model = delegate(client, name);
  return model?.findUnique ? model.findUnique(args) : undefined;
}

async function deleteMany(client: PrivacyPrismaClient, name: string, args?: unknown) {
  const model = delegate(client, name);
  if (!model?.deleteMany) return 0;
  const result = await model.deleteMany(args) as { count?: number } | undefined;
  return result?.count ?? 0;
}

function ids(rows: unknown[]) {
  return rows
    .map((row) => (row && typeof row === "object" && "id" in row ? String((row as { id: unknown }).id) : undefined))
    .filter((id): id is string => Boolean(id));
}

function stringField(row: unknown, field: string) {
  return row && typeof row === "object" && field in row && typeof (row as Record<string, unknown>)[field] === "string" ? (row as Record<string, string>)[field] : undefined;
}

export interface UserDataExport {
  exportedAt: string;
  userId: string;
  user: unknown;
  profileFacts: unknown[];
  masterResumes: unknown[];
  resumeVersions: unknown[];
  documentExports: unknown[];
  documentVersions: unknown[];
  documentMetadata: unknown[];
  jobs: unknown[];
  applications: unknown[];
  applicationPackets: unknown[];
  approvals: unknown[];
  events: unknown[];
  stateProjections: unknown[];
  snapshots: unknown[];
}

export interface UserDeletionResult {
  deletedAt: string;
  userId: string;
  counts: Record<string, number>;
}

export class PrivacyService {
  constructor(private readonly client: PrivacyPrismaClient = defaultPrisma as unknown as PrivacyPrismaClient) {}

  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await findUnique(this.client, "user", { where: { id: userId } });
    const applications = await findMany(this.client, "application", { where: { userId }, orderBy: { createdAt: "desc" } });
    const applicationIds = ids(applications);
    const applicationJobIds = applications.map((application) => stringField(application, "jobId")).filter((id): id is string => Boolean(id));
    const jobs = await findMany(this.client, "job", { where: { OR: [{ userId }, { id: { in: applicationJobIds } }] }, orderBy: { createdAt: "desc" } });
    const jobIds = ids(jobs);
    const applicationPackets = await findMany(this.client, "applicationPacket", { where: { OR: [{ userId }, { applicationId: { in: applicationIds } }, { jobId: { in: jobIds } }] }, orderBy: { updatedAt: "desc" } });
    const masterResumes = await findMany(this.client, "masterResume", { where: { userId } });
    const masterResumeIds = ids(masterResumes);
    const resumeVersions = await findMany(this.client, "resumeVersion", { where: { OR: [{ userId }, { masterResumeId: { in: masterResumeIds } }] }, orderBy: { createdAt: "desc" } });
    const documentExports = await findMany(this.client, "documentExport", { where: { userId }, orderBy: { createdAt: "desc" } });
    const documentExportIds = ids(documentExports);

    const [profileFacts, documentVersions, documentMetadata, approvals, events, stateProjections, snapshots] = await Promise.all([
      findMany(this.client, "profileFact", { where: { userId }, orderBy: { updatedAt: "desc" } }),
      findMany(this.client, "documentVersion", { where: { OR: [{ userId }, { documentId: { in: documentExportIds } }] }, orderBy: { createdAt: "desc" } }),
      findMany(this.client, "documentMetadata", { where: { OR: [{ userId }, { documentId: { in: documentExportIds } }] } }),
      findMany(this.client, "approvalRequest", { where: { userId }, orderBy: { createdAt: "desc" } }),
      findMany(this.client, "event", { where: { userId }, orderBy: { createdAt: "desc" } }),
      findMany(this.client, "stateProjection", { where: { userId }, orderBy: { updatedAt: "desc" } }),
      findMany(this.client, "snapshot", { where: { userId }, orderBy: { createdAt: "desc" } })
    ]);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      user,
      profileFacts,
      masterResumes,
      resumeVersions,
      documentExports,
      documentVersions,
      documentMetadata,
      jobs,
      applications,
      applicationPackets,
      approvals,
      events,
      stateProjections,
      snapshots
    };
  }

  async deleteUserData(userId: string): Promise<UserDeletionResult> {
    const exportData = await this.exportUserData(userId);
    const applicationIds = ids(exportData.applications);
    const jobIds = ids(exportData.jobs);
    const documentExportIds = ids(exportData.documentExports);
    const masterResumeIds = ids(exportData.masterResumes);
    const applicationQuestions = await findMany(this.client, "applicationQuestion", { where: { applicationId: { in: applicationIds } } });
    const applicationQuestionIds = ids(applicationQuestions);
    const counts: Record<string, number> = {};

    counts.applicationAnswer = await deleteMany(this.client, "applicationAnswer", { where: { questionId: { in: applicationQuestionIds } } });
    counts.applicationStatusHistory = await deleteMany(this.client, "applicationStatusHistory", { where: { applicationId: { in: applicationIds } } });
    counts.applicationDocument = await deleteMany(this.client, "applicationDocument", { where: { applicationId: { in: applicationIds } } });
    counts.applicationEvent = await deleteMany(this.client, "applicationEvent", { where: { applicationId: { in: applicationIds } } });
    counts.applicationQuestion = await deleteMany(this.client, "applicationQuestion", { where: { applicationId: { in: applicationIds } } });
    counts.applicationPacket = await deleteMany(this.client, "applicationPacket", { where: { OR: [{ userId }, { applicationId: { in: applicationIds } }, { jobId: { in: jobIds } }] } });
    counts.application = await deleteMany(this.client, "application", { where: { userId } });

    counts.documentVersion = await deleteMany(this.client, "documentVersion", { where: { OR: [{ userId }, { documentId: { in: documentExportIds } }] } });
    counts.documentMetadata = await deleteMany(this.client, "documentMetadata", { where: { OR: [{ userId }, { documentId: { in: documentExportIds } }] } });
    counts.documentExport = await deleteMany(this.client, "documentExport", { where: { userId } });
    counts.resumeVersion = await deleteMany(this.client, "resumeVersion", { where: { OR: [{ userId }, { masterResumeId: { in: masterResumeIds } }] } });
    counts.masterResume = await deleteMany(this.client, "masterResume", { where: { userId } });
    counts.profileFact = await deleteMany(this.client, "profileFact", { where: { userId } });

    counts.jobSource = await deleteMany(this.client, "jobSource", { where: { jobId: { in: jobIds } } });
    counts.jobSnapshot = await deleteMany(this.client, "jobSnapshot", { where: { jobId: { in: jobIds } } });
    counts.jobSkill = await deleteMany(this.client, "jobSkill", { where: { jobId: { in: jobIds } } });
    counts.jobCertification = await deleteMany(this.client, "jobCertification", { where: { jobId: { in: jobIds } } });
    counts.jobClearanceFlag = await deleteMany(this.client, "jobClearanceFlag", { where: { jobId: { in: jobIds } } });
    counts.jobRemoteClassification = await deleteMany(this.client, "jobRemoteClassification", { where: { jobId: { in: jobIds } } });
    counts.jobSalaryRange = await deleteMany(this.client, "jobSalaryRange", { where: { jobId: { in: jobIds } } });
    counts.jobSegment = await deleteMany(this.client, "jobSegment", { where: { jobId: { in: jobIds } } });
    counts.jobFitScore = await deleteMany(this.client, "jobFitScore", { where: { jobId: { in: jobIds } } });
    counts.jobApplicationDifficultyScore = await deleteMany(this.client, "jobApplicationDifficultyScore", { where: { jobId: { in: jobIds } } });
    counts.jobDuplicate = await deleteMany(this.client, "jobDuplicate", { where: { OR: [{ canonicalJobId: { in: jobIds } }, { duplicateJobId: { in: jobIds } }] } });
    counts.job = await deleteMany(this.client, "job", { where: { id: { in: jobIds }, userId } });

    counts.approvalRequest = await deleteMany(this.client, "approvalRequest", { where: { userId } });
    counts.event = await deleteMany(this.client, "event", { where: { userId } });
    counts.stateProjection = await deleteMany(this.client, "stateProjection", { where: { userId } });
    counts.snapshot = await deleteMany(this.client, "snapshot", { where: { userId } });
    counts.session = await deleteMany(this.client, "session", { where: { userId } });
    counts.account = await deleteMany(this.client, "account", { where: { userId } });
    counts.userPreference = await deleteMany(this.client, "userPreference", { where: { userId } });
    counts.userProfile = await deleteMany(this.client, "userProfile", { where: { userId } });

    const userDelegate = delegate(this.client, "user");
    if (userDelegate?.delete) {
      await userDelegate.delete({ where: { id: userId } });
      counts.user = 1;
    } else {
      counts.user = 0;
    }

    return { deletedAt: new Date().toISOString(), userId, counts };
  }
}

export const privacyService = new PrivacyService();
