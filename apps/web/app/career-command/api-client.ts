import { failedUploadStatusMessage, isRecord, text, type UnknownRecord } from "./helpers";

export type CommandEnvelope<T = unknown> = { commandId: string; status: string; result: T };

export async function postCommand<T>(url: string, payload: UnknownRecord = {}): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => undefined) as unknown;
  if (!response.ok || !isRecord(body) || body.ok !== true) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    throw new Error(text(error?.message, "Request failed"));
  }
  return (body.data as CommandEnvelope<T>).result;
}

export async function postForm<T>(url: string, formData: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: formData });
  } catch (error) {
    throw new Error(error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed before reaching the server.");
  }

  const body = await response.json().catch(() => undefined) as unknown;
  if (!response.ok || !isRecord(body) || body.ok !== true) {
    if (response.status >= 500) throw new Error(failedUploadStatusMessage);
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    const message = text(error?.message, response.statusText || "Upload failed");
    throw new Error(`Upload failed: ${message}`);
  }
  return (body.data as CommandEnvelope<T>).result;
}

export async function postAction<T>(url: string, payload: UnknownRecord = {}): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => undefined) as unknown;
  if (!response.ok || !isRecord(body) || body.ok !== true) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    throw new Error(text(error?.message, "Request failed"));
  }
  return body.data as T;
}
