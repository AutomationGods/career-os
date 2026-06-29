-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('placeholder', 'partial', 'implemented', 'deprecated', 'disabled');

-- CreateEnum
CREATE TYPE "ApplicationPacketStatus" AS ENUM ('not_started', 'ready_to_generate', 'generated', 'awaiting_review', 'ready_to_apply', 'submitted', 'followup_due', 'closed');

-- CreateEnum
CREATE TYPE "JobSegmentValue" AS ENUM ('REMOTE_COMMERCIAL', 'HYBRID_COMMERCIAL', 'ONSITE_COMMERCIAL', 'CONTRACT', 'CLEARANCE_GOVERNMENT', 'PUBLIC_TRUST', 'SECRET', 'TOP_SECRET', 'TS_SCI', 'POLYGRAPH', 'CLEARANCE_ELIGIBLE', 'UNKNOWN_CLEARANCE_RISK', 'LOW_FIT', 'ARCHIVED_REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "skills" TEXT[],
    "targetRoles" TEXT[],

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remoteFirst" BOOLEAN NOT NULL DEFAULT true,
    "commercialFirst" BOOLEAN NOT NULL DEFAULT true,
    "clearanceSeparated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileFact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "factType" TEXT NOT NULL,
    "category" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "source" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'unknown',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "verificationStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "allowedInResume" BOOLEAN NOT NULL DEFAULT false,
    "allowedInCoverLetter" BOOLEAN NOT NULL DEFAULT false,
    "allowedInRecruiterMessage" BOOLEAN NOT NULL DEFAULT false,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRegistry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "manager" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'placeholder',
    "version" TEXT NOT NULL,

    CONSTRAINT "DomainRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityRegistry" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commands" TEXT[],
    "events" TEXT[],
    "permissions" TEXT[],

    CONSTRAINT "CapabilityRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerRegistry" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'placeholder',

    CONSTRAINT "WorkerRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolRegistry" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'placeholder',

    CONSTRAINT "ToolRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "manager" TEXT,
    "capability" TEXT,
    "worker" TEXT,
    "userId" TEXT,
    "payload" JSONB,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION,
    "modelUsed" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateProjection" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sourceEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "commandType" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestPayload" JSONB,
    "decisionPayload" JSONB,
    "replayStatus" TEXT NOT NULL DEFAULT 'not_started',
    "replayedCommandId" TEXT,
    "replayResult" JSONB,
    "replayError" JSONB,
    "replayAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "replayedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySource" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "CompanySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAlias" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "CompanyAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyTechnology" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,

    CONSTRAINT "CompanyTechnology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyWatchlist" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyWatchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',

    CONSTRAINT "CareerPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtsProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "atsName" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "AtsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtsPlaybook" (
    "id" TEXT NOT NULL,
    "atsProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "AtsPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSnapshot" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCertification" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "certification" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JobCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobClearanceFlag" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "evidence" TEXT,

    CONSTRAINT "JobClearanceFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRemoteClassification" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "JobRemoteClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSalaryRange" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "min" INTEGER,
    "max" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',

    CONSTRAINT "JobSalaryRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSegment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "segment" "JobSegmentValue" NOT NULL,
    "reason" TEXT,

    CONSTRAINT "JobSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDuplicate" (
    "id" TEXT NOT NULL,
    "canonicalJobId" TEXT NOT NULL,
    "duplicateJobId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "JobDuplicate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFitScore" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "evidence" JSONB,

    CONSTRAINT "JobFitScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplicationDifficultyScore" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "evidence" JSONB,

    CONSTRAINT "JobApplicationDifficultyScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready_to_apply',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationPacket" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT,
    "companyId" TEXT,
    "personId" TEXT,
    "fitScoreSummary" JSONB,
    "resumePlaceholder" TEXT,
    "coverLetterPlaceholder" TEXT,
    "recruiterMessagePlaceholder" TEXT,
    "notes" TEXT[],
    "status" "ApplicationPacketStatus" NOT NULL DEFAULT 'not_started',
    "nextAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationPacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationQuestion" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApplicationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterResume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "MasterResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "masterResumeId" TEXT,
    "jobId" TEXT,
    "companyId" TEXT,
    "content" JSONB NOT NULL,
    "templateId" TEXT,
    "templateKey" TEXT,
    "sectionOrder" TEXT[],
    "reviewChecklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "content" JSONB,

    CONSTRAINT "ResumeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterMessage" (
    "id" TEXT NOT NULL,
    "personId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentExport" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentMetadata" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "DocumentMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "linkedinUrl" TEXT,
    "currentCompanyId" TEXT,
    "companyName" TEXT,
    "agency" TEXT,
    "relationshipScore" INTEGER NOT NULL DEFAULT 0,
    "relevanceScore" INTEGER NOT NULL DEFAULT 0,
    "responsivenessScore" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "lastContactDate" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "nextFollowupAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonRole" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "companyId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "PersonRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonEmail" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "PersonEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonPhoneNumber" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "PersonPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "jobsSent" INTEGER NOT NULL DEFAULT 0,
    "relevantJobsSent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RecruiterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringManagerProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "HiringManagerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewerProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "InterviewerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "ReferralProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipEvent" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "subject" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactTimeline" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerThreadId" TEXT NOT NULL,
    "subject" TEXT,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "subject" TEXT,
    "body" TEXT,
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailClassification" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "EmailClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "url" TEXT,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "to" TEXT[],
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "CalendarAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewEvent" (
    "id" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "companyId" TEXT,
    "jobId" TEXT,
    "stage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',

    CONSTRAINT "InterviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingLink" (
    "id" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "MeetingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAttendee" (
    "id" TEXT NOT NULL,
    "interviewEventId" TEXT NOT NULL,
    "personId" TEXT,
    "email" TEXT,

    CONSTRAINT "InterviewAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowupRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "maxAttempts" INTEGER NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FollowupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Followup" (
    "id" TEXT NOT NULL,
    "personId" TEXT,
    "applicationId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'due',

    CONSTRAINT "Followup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowupEvent" (
    "id" TEXT NOT NULL,
    "followupId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowupEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowupTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "FollowupTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnoozeRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,

    CONSTRAINT "SnoozeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "KnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "MemoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SkillGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketMetric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "LearningMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "ReputationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "companyId" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "ReferralOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "OpportunityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "FinanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryBenchmark" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "min" INTEGER,
    "max" INTEGER,
    "source" TEXT NOT NULL,

    CONSTRAINT "SalaryBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferRecord" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "OfferRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "ResearchNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulationType" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "ProfileFact_userId_idx" ON "ProfileFact"("userId");

-- CreateIndex
CREATE INDEX "ProfileFact_userId_verificationStatus_idx" ON "ProfileFact"("userId", "verificationStatus");

-- CreateIndex
CREATE INDEX "ProfileFact_userId_allowedInResume_idx" ON "ProfileFact"("userId", "allowedInResume");

-- CreateIndex
CREATE INDEX "ProfileFact_userId_isBlocked_idx" ON "ProfileFact"("userId", "isBlocked");

-- CreateIndex
CREATE INDEX "ProfileFact_updatedAt_idx" ON "ProfileFact"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileFact_userId_label_factType_key" ON "ProfileFact"("userId", "label", "factType");

-- CreateIndex
CREATE UNIQUE INDEX "DomainRegistry_slug_key" ON "DomainRegistry"("slug");

-- CreateIndex
CREATE INDEX "CapabilityRegistry_domainId_idx" ON "CapabilityRegistry"("domainId");

-- CreateIndex
CREATE INDEX "WorkerRegistry_domainId_idx" ON "WorkerRegistry"("domainId");

-- CreateIndex
CREATE INDEX "ToolRegistry_domainId_idx" ON "ToolRegistry"("domainId");

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE INDEX "Event_entityType_idx" ON "Event"("entityType");

-- CreateIndex
CREATE INDEX "Event_entityId_idx" ON "Event"("entityId");

-- CreateIndex
CREATE INDEX "Event_eventType_entityType_entityId_idx" ON "Event"("eventType", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Event_domain_idx" ON "Event"("domain");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "StateProjection_userId_idx" ON "StateProjection"("userId");

-- CreateIndex
CREATE INDEX "StateProjection_projectionType_idx" ON "StateProjection"("projectionType");

-- CreateIndex
CREATE INDEX "StateProjection_entityType_idx" ON "StateProjection"("entityType");

-- CreateIndex
CREATE INDEX "StateProjection_entityId_idx" ON "StateProjection"("entityId");

-- CreateIndex
CREATE INDEX "StateProjection_updatedAt_idx" ON "StateProjection"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StateProjection_projectionType_entityType_entityId_key" ON "StateProjection"("projectionType", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Snapshot_userId_idx" ON "Snapshot"("userId");

-- CreateIndex
CREATE INDEX "Snapshot_entityType_entityId_idx" ON "Snapshot"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Snapshot_snapshotType_idx" ON "Snapshot"("snapshotType");

-- CreateIndex
CREATE INDEX "Snapshot_createdAt_idx" ON "Snapshot"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_userId_idx" ON "ApprovalRequest"("userId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_commandId_idx" ON "ApprovalRequest"("commandId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_commandType_idx" ON "ApprovalRequest"("commandType");

-- CreateIndex
CREATE INDEX "ApprovalRequest_permission_idx" ON "ApprovalRequest"("permission");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_replayStatus_idx" ON "ApprovalRequest"("replayStatus");

-- CreateIndex
CREATE INDEX "ApprovalRequest_replayedCommandId_idx" ON "ApprovalRequest"("replayedCommandId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_createdAt_idx" ON "ApprovalRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_createdAt_idx" ON "Company"("createdAt");

-- CreateIndex
CREATE INDEX "CompanySource_companyId_idx" ON "CompanySource"("companyId");

-- CreateIndex
CREATE INDEX "CompanyAlias_companyId_idx" ON "CompanyAlias"("companyId");

-- CreateIndex
CREATE INDEX "CompanyAlias_alias_idx" ON "CompanyAlias"("alias");

-- CreateIndex
CREATE INDEX "CompanyTechnology_companyId_idx" ON "CompanyTechnology"("companyId");

-- CreateIndex
CREATE INDEX "CompanyTechnology_technology_idx" ON "CompanyTechnology"("technology");

-- CreateIndex
CREATE INDEX "CompanyWatchlist_companyId_idx" ON "CompanyWatchlist"("companyId");

-- CreateIndex
CREATE INDEX "CompanyWatchlist_userId_idx" ON "CompanyWatchlist"("userId");

-- CreateIndex
CREATE INDEX "CareerPage_companyId_idx" ON "CareerPage"("companyId");

-- CreateIndex
CREATE INDEX "CareerPage_status_idx" ON "CareerPage"("status");

-- CreateIndex
CREATE INDEX "AtsProfile_companyId_idx" ON "AtsProfile"("companyId");

-- CreateIndex
CREATE INDEX "AtsProfile_atsName_idx" ON "AtsProfile"("atsName");

-- CreateIndex
CREATE INDEX "AtsPlaybook_atsProfileId_idx" ON "AtsPlaybook"("atsProfileId");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "JobSnapshot_jobId_idx" ON "JobSnapshot"("jobId");

-- CreateIndex
CREATE INDEX "JobSnapshot_capturedAt_idx" ON "JobSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "JobSource_jobId_idx" ON "JobSource"("jobId");

-- CreateIndex
CREATE INDEX "JobSource_source_idx" ON "JobSource"("source");

-- CreateIndex
CREATE INDEX "JobSkill_jobId_idx" ON "JobSkill"("jobId");

-- CreateIndex
CREATE INDEX "JobSkill_skill_idx" ON "JobSkill"("skill");

-- CreateIndex
CREATE INDEX "JobCertification_jobId_idx" ON "JobCertification"("jobId");

-- CreateIndex
CREATE INDEX "JobCertification_certification_idx" ON "JobCertification"("certification");

-- CreateIndex
CREATE INDEX "JobClearanceFlag_jobId_idx" ON "JobClearanceFlag"("jobId");

-- CreateIndex
CREATE INDEX "JobClearanceFlag_flag_idx" ON "JobClearanceFlag"("flag");

-- CreateIndex
CREATE INDEX "JobRemoteClassification_jobId_idx" ON "JobRemoteClassification"("jobId");

-- CreateIndex
CREATE INDEX "JobRemoteClassification_classification_idx" ON "JobRemoteClassification"("classification");

-- CreateIndex
CREATE INDEX "JobSalaryRange_jobId_idx" ON "JobSalaryRange"("jobId");

-- CreateIndex
CREATE INDEX "JobSegment_jobId_idx" ON "JobSegment"("jobId");

-- CreateIndex
CREATE INDEX "JobSegment_segment_idx" ON "JobSegment"("segment");

-- CreateIndex
CREATE INDEX "JobDuplicate_canonicalJobId_idx" ON "JobDuplicate"("canonicalJobId");

-- CreateIndex
CREATE INDEX "JobDuplicate_duplicateJobId_idx" ON "JobDuplicate"("duplicateJobId");

-- CreateIndex
CREATE INDEX "JobFitScore_jobId_idx" ON "JobFitScore"("jobId");

-- CreateIndex
CREATE INDEX "JobFitScore_score_idx" ON "JobFitScore"("score");

-- CreateIndex
CREATE INDEX "JobApplicationDifficultyScore_jobId_idx" ON "JobApplicationDifficultyScore"("jobId");

-- CreateIndex
CREATE INDEX "JobApplicationDifficultyScore_score_idx" ON "JobApplicationDifficultyScore"("score");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");

-- CreateIndex
CREATE INDEX "ApplicationPacket_applicationId_idx" ON "ApplicationPacket"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationPacket_jobId_idx" ON "ApplicationPacket"("jobId");

-- CreateIndex
CREATE INDEX "ApplicationPacket_companyId_idx" ON "ApplicationPacket"("companyId");

-- CreateIndex
CREATE INDEX "ApplicationPacket_personId_idx" ON "ApplicationPacket"("personId");

-- CreateIndex
CREATE INDEX "ApplicationPacket_status_idx" ON "ApplicationPacket"("status");

-- CreateIndex
CREATE INDEX "ApplicationPacket_createdAt_idx" ON "ApplicationPacket"("createdAt");

-- CreateIndex
CREATE INDEX "ApplicationPacket_updatedAt_idx" ON "ApplicationPacket"("updatedAt");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_idx" ON "ApplicationEvent"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationEvent_eventType_idx" ON "ApplicationEvent"("eventType");

-- CreateIndex
CREATE INDEX "ApplicationEvent_createdAt_idx" ON "ApplicationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ApplicationQuestion_applicationId_idx" ON "ApplicationQuestion"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationAnswer_questionId_idx" ON "ApplicationAnswer"("questionId");

-- CreateIndex
CREATE INDEX "ApplicationAnswer_approved_idx" ON "ApplicationAnswer"("approved");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_documentType_idx" ON "ApplicationDocument"("documentType");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_idx" ON "ApplicationStatusHistory"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_status_idx" ON "ApplicationStatusHistory"("status");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_createdAt_idx" ON "ApplicationStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "MasterResume_userId_idx" ON "MasterResume"("userId");

-- CreateIndex
CREATE INDEX "ResumeVersion_masterResumeId_idx" ON "ResumeVersion"("masterResumeId");

-- CreateIndex
CREATE INDEX "ResumeVersion_jobId_idx" ON "ResumeVersion"("jobId");

-- CreateIndex
CREATE INDEX "ResumeVersion_companyId_idx" ON "ResumeVersion"("companyId");

-- CreateIndex
CREATE INDEX "ResumeVersion_templateKey_idx" ON "ResumeVersion"("templateKey");

-- CreateIndex
CREATE INDEX "CoverLetter_applicationId_idx" ON "CoverLetter"("applicationId");

-- CreateIndex
CREATE INDEX "CoverLetter_status_idx" ON "CoverLetter"("status");

-- CreateIndex
CREATE INDEX "RecruiterMessage_personId_idx" ON "RecruiterMessage"("personId");

-- CreateIndex
CREATE INDEX "RecruiterMessage_createdAt_idx" ON "RecruiterMessage"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentExport_documentType_idx" ON "DocumentExport"("documentType");

-- CreateIndex
CREATE INDEX "DocumentExport_createdAt_idx" ON "DocumentExport"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentType_documentId_idx" ON "DocumentVersion"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "DocumentVersion_createdAt_idx" ON "DocumentVersion"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentMetadata_documentType_documentId_idx" ON "DocumentMetadata"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "Person_currentCompanyId_idx" ON "Person"("currentCompanyId");

-- CreateIndex
CREATE INDEX "Person_normalizedName_idx" ON "Person"("normalizedName");

-- CreateIndex
CREATE INDEX "Person_companyName_idx" ON "Person"("companyName");

-- CreateIndex
CREATE INDEX "Person_relationshipScore_idx" ON "Person"("relationshipScore");

-- CreateIndex
CREATE INDEX "Person_trustScore_idx" ON "Person"("trustScore");

-- CreateIndex
CREATE INDEX "Person_responsivenessScore_idx" ON "Person"("responsivenessScore");

-- CreateIndex
CREATE INDEX "Person_lastContactedAt_idx" ON "Person"("lastContactedAt");

-- CreateIndex
CREATE INDEX "Person_nextFollowupAt_idx" ON "Person"("nextFollowupAt");

-- CreateIndex
CREATE INDEX "PersonRole_personId_idx" ON "PersonRole"("personId");

-- CreateIndex
CREATE INDEX "PersonRole_companyId_idx" ON "PersonRole"("companyId");

-- CreateIndex
CREATE INDEX "PersonRole_role_idx" ON "PersonRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PersonEmail_email_key" ON "PersonEmail"("email");

-- CreateIndex
CREATE INDEX "PersonEmail_personId_idx" ON "PersonEmail"("personId");

-- CreateIndex
CREATE INDEX "PersonPhoneNumber_personId_idx" ON "PersonPhoneNumber"("personId");

-- CreateIndex
CREATE INDEX "PersonPhoneNumber_phone_idx" ON "PersonPhoneNumber"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterProfile_personId_key" ON "RecruiterProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "HiringManagerProfile_personId_key" ON "HiringManagerProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewerProfile_personId_key" ON "InterviewerProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralProfile_personId_key" ON "ReferralProfile"("personId");

-- CreateIndex
CREATE INDEX "Relationship_personId_idx" ON "Relationship"("personId");

-- CreateIndex
CREATE INDEX "Relationship_userId_idx" ON "Relationship"("userId");

-- CreateIndex
CREATE INDEX "Relationship_status_idx" ON "Relationship"("status");

-- CreateIndex
CREATE INDEX "RelationshipEvent_personId_idx" ON "RelationshipEvent"("personId");

-- CreateIndex
CREATE INDEX "RelationshipEvent_eventType_idx" ON "RelationshipEvent"("eventType");

-- CreateIndex
CREATE INDEX "RelationshipEvent_createdAt_idx" ON "RelationshipEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Conversation_personId_idx" ON "Conversation"("personId");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_idx" ON "ConversationMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationMessage_createdAt_idx" ON "ConversationMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ContactTimeline_personId_idx" ON "ContactTimeline"("personId");

-- CreateIndex
CREATE INDEX "ContactTimeline_eventType_idx" ON "ContactTimeline"("eventType");

-- CreateIndex
CREATE INDEX "ContactTimeline_createdAt_idx" ON "ContactTimeline"("createdAt");

-- CreateIndex
CREATE INDEX "EmailAccount_userId_idx" ON "EmailAccount"("userId");

-- CreateIndex
CREATE INDEX "EmailThread_accountId_idx" ON "EmailThread"("accountId");

-- CreateIndex
CREATE INDEX "EmailThread_providerThreadId_idx" ON "EmailThread"("providerThreadId");

-- CreateIndex
CREATE INDEX "EmailMessage_threadId_idx" ON "EmailMessage"("threadId");

-- CreateIndex
CREATE INDEX "EmailMessage_receivedAt_idx" ON "EmailMessage"("receivedAt");

-- CreateIndex
CREATE INDEX "EmailClassification_messageId_idx" ON "EmailClassification"("messageId");

-- CreateIndex
CREATE INDEX "EmailClassification_category_idx" ON "EmailClassification"("category");

-- CreateIndex
CREATE INDEX "EmailAttachment_messageId_idx" ON "EmailAttachment"("messageId");

-- CreateIndex
CREATE INDEX "EmailDraft_accountId_idx" ON "EmailDraft"("accountId");

-- CreateIndex
CREATE INDEX "EmailDraft_approvalRequired_idx" ON "EmailDraft"("approvalRequired");

-- CreateIndex
CREATE INDEX "CalendarAccount_userId_idx" ON "CalendarAccount"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_accountId_idx" ON "CalendarEvent"("accountId");

-- CreateIndex
CREATE INDEX "CalendarEvent_startsAt_idx" ON "CalendarEvent"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewEvent_calendarEventId_key" ON "InterviewEvent"("calendarEventId");

-- CreateIndex
CREATE INDEX "InterviewEvent_companyId_idx" ON "InterviewEvent"("companyId");

-- CreateIndex
CREATE INDEX "InterviewEvent_jobId_idx" ON "InterviewEvent"("jobId");

-- CreateIndex
CREATE INDEX "InterviewEvent_status_idx" ON "InterviewEvent"("status");

-- CreateIndex
CREATE INDEX "MeetingLink_calendarEventId_idx" ON "MeetingLink"("calendarEventId");

-- CreateIndex
CREATE INDEX "InterviewAttendee_interviewEventId_idx" ON "InterviewAttendee"("interviewEventId");

-- CreateIndex
CREATE INDEX "InterviewAttendee_personId_idx" ON "InterviewAttendee"("personId");

-- CreateIndex
CREATE INDEX "Followup_personId_idx" ON "Followup"("personId");

-- CreateIndex
CREATE INDEX "Followup_applicationId_idx" ON "Followup"("applicationId");

-- CreateIndex
CREATE INDEX "Followup_dueAt_idx" ON "Followup"("dueAt");

-- CreateIndex
CREATE INDEX "Followup_status_idx" ON "Followup"("status");

-- CreateIndex
CREATE INDEX "FollowupEvent_followupId_idx" ON "FollowupEvent"("followupId");

-- CreateIndex
CREATE INDEX "FollowupEvent_eventType_idx" ON "FollowupEvent"("eventType");

-- CreateIndex
CREATE INDEX "FollowupEvent_createdAt_idx" ON "FollowupEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MemoryItem_userId_idx" ON "MemoryItem"("userId");

-- CreateIndex
CREATE INDEX "SkillGap_userId_idx" ON "SkillGap"("userId");

-- CreateIndex
CREATE INDEX "SkillGap_skill_idx" ON "SkillGap"("skill");

-- CreateIndex
CREATE INDEX "MarketMetric_name_idx" ON "MarketMetric"("name");

-- CreateIndex
CREATE INDEX "MarketMetric_capturedAt_idx" ON "MarketMetric"("capturedAt");

-- CreateIndex
CREATE INDEX "LearningMetric_userId_idx" ON "LearningMetric"("userId");

-- CreateIndex
CREATE INDEX "LearningMetric_metric_idx" ON "LearningMetric"("metric");

-- CreateIndex
CREATE INDEX "ReputationRecord_userId_idx" ON "ReputationRecord"("userId");

-- CreateIndex
CREATE INDEX "ReputationRecord_source_idx" ON "ReputationRecord"("source");

-- CreateIndex
CREATE INDEX "ReferralOpportunity_userId_idx" ON "ReferralOpportunity"("userId");

-- CreateIndex
CREATE INDEX "ReferralOpportunity_personId_idx" ON "ReferralOpportunity"("personId");

-- CreateIndex
CREATE INDEX "ReferralOpportunity_companyId_idx" ON "ReferralOpportunity"("companyId");

-- CreateIndex
CREATE INDEX "ReferralOpportunity_status_idx" ON "ReferralOpportunity"("status");

-- CreateIndex
CREATE INDEX "OpportunityRecord_userId_idx" ON "OpportunityRecord"("userId");

-- CreateIndex
CREATE INDEX "OpportunityRecord_source_idx" ON "OpportunityRecord"("source");

-- CreateIndex
CREATE INDEX "FinanceRecord_userId_idx" ON "FinanceRecord"("userId");

-- CreateIndex
CREATE INDEX "FinanceRecord_recordType_idx" ON "FinanceRecord"("recordType");

-- CreateIndex
CREATE INDEX "SalaryBenchmark_role_idx" ON "SalaryBenchmark"("role");

-- CreateIndex
CREATE INDEX "SalaryBenchmark_location_idx" ON "SalaryBenchmark"("location");

-- CreateIndex
CREATE INDEX "OfferRecord_applicationId_idx" ON "OfferRecord"("applicationId");

-- CreateIndex
CREATE INDEX "OfferRecord_status_idx" ON "OfferRecord"("status");

-- CreateIndex
CREATE INDEX "ResearchNote_userId_idx" ON "ResearchNote"("userId");

-- CreateIndex
CREATE INDEX "SimulationResult_userId_idx" ON "SimulationResult"("userId");

-- CreateIndex
CREATE INDEX "SimulationResult_simulationType_idx" ON "SimulationResult"("simulationType");

-- CreateIndex
CREATE INDEX "SimulationResult_createdAt_idx" ON "SimulationResult"("createdAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapabilityRegistry" ADD CONSTRAINT "CapabilityRegistry_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "DomainRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerRegistry" ADD CONSTRAINT "WorkerRegistry_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "DomainRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolRegistry" ADD CONSTRAINT "ToolRegistry_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "DomainRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySource" ADD CONSTRAINT "CompanySource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAlias" ADD CONSTRAINT "CompanyAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTechnology" ADD CONSTRAINT "CompanyTechnology_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyWatchlist" ADD CONSTRAINT "CompanyWatchlist_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPage" ADD CONSTRAINT "CareerPage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsProfile" ADD CONSTRAINT "AtsProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtsPlaybook" ADD CONSTRAINT "AtsPlaybook_atsProfileId_fkey" FOREIGN KEY ("atsProfileId") REFERENCES "AtsProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSnapshot" ADD CONSTRAINT "JobSnapshot_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCertification" ADD CONSTRAINT "JobCertification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClearanceFlag" ADD CONSTRAINT "JobClearanceFlag_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRemoteClassification" ADD CONSTRAINT "JobRemoteClassification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSalaryRange" ADD CONSTRAINT "JobSalaryRange_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSegment" ADD CONSTRAINT "JobSegment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFitScore" ADD CONSTRAINT "JobFitScore_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationDifficultyScore" ADD CONSTRAINT "JobApplicationDifficultyScore_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPacket" ADD CONSTRAINT "ApplicationPacket_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPacket" ADD CONSTRAINT "ApplicationPacket_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPacket" ADD CONSTRAINT "ApplicationPacket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPacket" ADD CONSTRAINT "ApplicationPacket_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationQuestion" ADD CONSTRAINT "ApplicationQuestion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ApplicationQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_masterResumeId_fkey" FOREIGN KEY ("masterResumeId") REFERENCES "MasterResume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_currentCompanyId_fkey" FOREIGN KEY ("currentCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonEmail" ADD CONSTRAINT "PersonEmail_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPhoneNumber" ADD CONSTRAINT "PersonPhoneNumber_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterProfile" ADD CONSTRAINT "RecruiterProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringManagerProfile" ADD CONSTRAINT "HiringManagerProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewerProfile" ADD CONSTRAINT "InterviewerProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralProfile" ADD CONSTRAINT "ReferralProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEvent" ADD CONSTRAINT "RelationshipEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTimeline" ADD CONSTRAINT "ContactTimeline_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailClassification" ADD CONSTRAINT "EmailClassification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingLink" ADD CONSTRAINT "MeetingLink_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAttendee" ADD CONSTRAINT "InterviewAttendee_interviewEventId_fkey" FOREIGN KEY ("interviewEventId") REFERENCES "InterviewEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowupEvent" ADD CONSTRAINT "FollowupEvent_followupId_fkey" FOREIGN KEY ("followupId") REFERENCES "Followup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

