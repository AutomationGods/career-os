import { normalizeJob } from "@career-os/domains";
import type { NormalizedJob } from "@career-os/shared";

export async function collectGreenhouseJobs(boardToken: string): Promise<NormalizedJob[]> {
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`);
  if (!response.ok) throw new Error(`Greenhouse collection failed: ${response.status}`);
  const data = await response.json() as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((job) => normalizeJob({ ...job, company: boardToken, source: "greenhouse", url: job.absolute_url as string | undefined }));
}
export async function collectLeverJobs(companySlug: string): Promise<NormalizedJob[]> {
  const response = await fetch(`https://api.lever.co/v0/postings/${companySlug}?mode=json`);
  if (!response.ok) throw new Error(`Lever collection failed: ${response.status}`);
  const data = await response.json() as Array<Record<string, unknown>>;
  return data.map((job) => normalizeJob({ ...job, title: String(job.text ?? "Untitled role"), company: companySlug, source: "lever", url: job.hostedUrl as string | undefined }));
}
export function collectAshbyJobsPlaceholder() { return { status: "placeholder", reason: "Ashby public posting shapes vary by organization." }; }
export function importManualJobUrl(url: string): NormalizedJob { return normalizeJob({ title: "Manual URL import pending extraction", company: "Unknown company", url, source: "manual-url" }); }
