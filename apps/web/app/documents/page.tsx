import DocumentsPanel from "./documents-panel";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  return (
    <main className="main">
      <span className="badge">Local exports</span>
      <h1>Documents</h1>
      <p className="muted">Local-only Markdown and DOCX exports generated from truthfulness-guarded resume drafts.</p>
      <p><a href="/resumes">Open Resume Factory</a></p>
      <DocumentsPanel />
    </main>
  );
}
