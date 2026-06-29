import { getDocumentExport } from "../../_handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getDocumentExport((await params).id, request);
}
