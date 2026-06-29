import { ok } from "../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ status: "ok", service: "career-os-web", checkedAt: new Date().toISOString() });
}
