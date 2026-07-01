import ResumeDemoPanel from "./resume-demo-panel";

export const dynamic = "force-dynamic";

export default function ResumesPage() {
  return (
    <main className="main">
      <span className="badge">Local review only</span>
      <h1>Resume Factory</h1>
      <p className="muted">Use packet detail pages for real packet-specific drafts; this page keeps a safe demo generator for testing the Resume Factory command.</p>
      <ResumeDemoPanel />
    </main>
  );
}
