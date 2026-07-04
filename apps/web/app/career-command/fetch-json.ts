type ApiEnvelope<T = unknown> = { ok: true; data: T } | { ok: false; error?: { code?: string; message?: string } };

export async function getJson<T>(url: string): Promise<T | undefined> {
  try {
    const response = await fetch(url);
    const body = await response.json().catch(() => undefined) as ApiEnvelope<T> | undefined;
    if (!response.ok || !body?.ok) return undefined;
    return body.data;
  } catch {
    return undefined;
  }
}
