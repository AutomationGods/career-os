import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const personSchema = z.object({
  name: z.string().min(1),
  emails: z.array(z.string()).optional(),
  phones: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
});

const dedupeSchema = z.union([
  z.array(personSchema),
  z.object({ people: z.array(personSchema) }),
]);

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = dedupeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid dedupe request. Provide an array of people or { people: [...] }.", "INVALID_DEDUPE_REQUEST", 400);

  const people = Array.isArray(parsed.data) ? parsed.data : parsed.data.people;
  const command = createCommand({
    type: "relationships.dedupe",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "person",
    payload: { people },
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}
