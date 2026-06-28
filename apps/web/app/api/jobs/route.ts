import { listJobs } from "./_handlers";

export async function GET(request: Request) {
  return listJobs(request);
}
