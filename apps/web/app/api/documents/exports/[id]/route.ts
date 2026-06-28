import { getDocumentExport } from "../../_handlers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return getDocumentExport(params.id);
}
