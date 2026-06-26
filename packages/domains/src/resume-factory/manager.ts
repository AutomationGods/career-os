import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Resume Factory Domain",
  slug: "resume-factory",
  manager: "Resume Factory Manager",
  capabilities: ["ResumeGenerationCapability"],
  workers: ["TechnicalResumeWorker", "TruthfulnessGuardWorker", "DocxExportWorker", "PdfExportWorker"],
  tools: ["TruthfulnessGuardTool", "DocxExportTool", "PdfExportTool"],
  commands: ["resume.generate_placeholder"],
  events: ["resume.placeholder_created"],
  permissions: ["generate_resume", "export_document"],
  dependencies: ["application-packet", "document-export"],
  status: "partial",
  version: "0.2.0"
};

export interface ResumeGenerationRequest {
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  verifiedFacts: string[];
}

export interface ResumeGenerationPlaceholder extends ResumeGenerationRequest {
  eventType: "resume.placeholder_created";
  content: string;
  warnings: string[];
}


export class ResumeFactoryManager {
  readonly definition = definition;

  createPlaceholder(request: ResumeGenerationRequest): ResumeGenerationPlaceholder {
    return {
      ...request,
      eventType: "resume.placeholder_created",
      content: "Resume placeholder only. AI generation/export is gated behind truthfulness checks and human approval.",
      warnings: ["Do not invent certifications, companies, dates, clearance, tools, or experience."]
    };
  }
}
