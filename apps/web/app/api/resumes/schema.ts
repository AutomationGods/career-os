import { z } from "zod";

export const resumeGenerateRequestSchema = z.object({
  userId: z.string().min(1).optional(),
  jobId: z.string().min(1),
  companyId: z.string().min(1).optional(),
  applicationPacketId: z.string().min(1),
  resumeVersionId: z.string().min(1).optional(),
  verifiedFacts: z.array(z.string().min(1)).optional().default([]),
  targetRole: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  jobDescription: z.string().min(1).optional(),
  targetKeywords: z.array(z.string().min(1)).optional(),
  templateKey: z.string().min(1).optional(),
  sectionOrder: z.array(z.string().min(1)).optional(),
  masterResumeId: z.string().min(1).optional()
});
