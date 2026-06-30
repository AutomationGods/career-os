import { getLocalDataTouchpoints, seedLocalDataTouchpoints } from "../../../_lib/local-data-runtime";
import { errorMessage, fail, ok } from "../../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getLocalDataTouchpoints());
  } catch (error) {
    return fail(errorMessage(error), "DATA_TOUCHPOINTS_QUERY_FAILED", 500);
  }
}

export async function POST() {
  try {
    return ok(await seedLocalDataTouchpoints(), { status: 201 });
  } catch (error) {
    return fail(errorMessage(error), "DATA_TOUCHPOINTS_SEED_FAILED", 500);
  }
}
