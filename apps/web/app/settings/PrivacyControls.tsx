"use client";

import { useState } from "react";

interface PrivacyControlsProps {
  deleteConfirmation: string;
}

export default function PrivacyControls({ deleteConfirmation }: PrivacyControlsProps) {
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setStatus("Preparing export...");
    setError(null);
    const response = await fetch("/api/privacy/export", { credentials: "same-origin" });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? "Export failed.");
      setStatus("Export failed");
      return;
    }

    const blob = new Blob([JSON.stringify(body.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `career-os-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Export downloaded");
  }

  async function deleteData() {
    setStatus("Deleting data...");
    setError(null);
    const response = await fetch("/api/privacy/delete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm })
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? "Deletion failed.");
      setStatus("Deletion failed");
      return;
    }

    setConfirm("");
    setStatus("Deletion complete");
  }

  return (
    <section className="section">
      <h2>Privacy controls</h2>
      <div className="grid">
        <div className="card">
          <strong>Export my data</strong>
          <p className="muted">Downloads jobs, packets, profile facts, resumes, documents, events, state, snapshots, and approvals as JSON.</p>
          <button type="button" onClick={() => void exportData()}>Download JSON Export</button>
        </div>
        <div className="warning-card">
          <strong>Delete my account data</strong>
          <p className="muted">This removes your Career OS data from launch-scope stores. Keep an export first if you need a copy.</p>
          <label>
            Type {deleteConfirmation}
            <input value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" />
          </label>
          <button type="button" disabled={confirm !== deleteConfirmation} onClick={() => void deleteData()}>Delete My Data</button>
        </div>
      </div>
      <div className="card" aria-live="polite">
        <strong>Status: {status}</strong>
        {error ? <p role="alert">Error: {error}</p> : null}
      </div>
    </section>
  );
}
