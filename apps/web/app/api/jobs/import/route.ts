import { importManualJob } from "../_handlers";

export async function POST(request: Request) {
  return importManualJob(request);
}
