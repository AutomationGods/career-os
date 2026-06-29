"use client";

import { useEffect, useState } from "react";
import { documentExportsFromEnvelope, type DocumentExportView } from "../resumes/resume-demo-panel-model";

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

export default function DocumentsPanel() {
  const [exports, setExports] = useState<DocumentExportView[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading document exports...");

  async function refresh() {
    setStatusMessage("Loading document exports...");
    const response = await fetch("/api/documents/exports", { cache: "no-store" });
    const body = await readJson(response);
    if (!response.ok) {
      setStatusMessage("Could not load document exports.");
      return;
    }
    const parsed = documentExportsFromEnvelope(body).map((item) => ({ ...item, downloadUrl: `/api/documents/exports/${item.id}/download` }));
    setExports(parsed);
    setStatusMessage(parsed.length > 0 ? `Loaded ${parsed.length} local export(s).` : "No local exports yet. Generate a resume, then export from /resumes.");
  }

  useEffect(() => {
    void refresh().catch(() => setStatusMessage("Could not load document exports."));
  }, []);

  return (
    <section className="section">
      <div className="card form-card">
        <strong>Local export history</strong>
        <p className="muted">No email, upload, submit, apply, Gmail, Calendar, browser automation, or AI provider action is performed here.</p>
        <button type="button" onClick={() => void refresh()}>Refresh exports</button>
        <p className="muted" aria-live="polite">{statusMessage}</p>
      </div>
      <div className="grid">
        {exports.map((item) => (
          <div className="card" key={item.id}>
            <strong>{item.content?.filename ?? item.id}</strong>
            <p className="muted">format: {item.format}</p>
            <p className="muted">document export ID: {item.id}</p>
            <p className="muted">local path: {item.url ?? "stored in local DocumentExport records"}</p>
            {item.content?.checksum ? <p className="muted">checksum: {item.content.checksum.slice(0, 16)}…</p> : null}
            <p><a href={item.downloadUrl}>Download</a></p>
          </div>
        ))}
        {exports.length === 0 ? <div className="card"><p className="muted">No exports found for your account yet.</p></div> : null}
      </div>
    </section>
  );
}
