import { seedInitialProfileFacts } from "../_handlers";

export async function POST(request: Request) {
  return seedInitialProfileFacts(request);
}
