import { createProfileFact, listProfileFacts } from "./_handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return listProfileFacts(request);
}

export async function POST(request: Request) {
  return createProfileFact(request);
}
