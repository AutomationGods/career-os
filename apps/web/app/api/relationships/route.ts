import { listRelationshipPeople } from "@career-os/domains";

export const dynamic = "force-dynamic";

export async function GET() { return Response.json({ relationships: listRelationshipPeople() }); }
