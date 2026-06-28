import { createDocumentExport } from "../_handlers";

export async function POST(request: Request) {
  return createDocumentExport(request);
}
