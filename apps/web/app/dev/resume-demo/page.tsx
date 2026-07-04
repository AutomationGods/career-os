import ResumeDemoPanel from "../../resumes/resume-demo-panel";

export const dynamic = "force-dynamic";

export default function ResumeDemoDevPage() {
  return (
    <main className="main">
      <span className="badge">Developer tool</span>
      <h1>Resume Draft Demo</h1>
      <p className="muted">Use packet detail pages for real packet-specific drafts; this page tests the resume draft command safely.</p>
      <ResumeDemoPanel />
    </main>
  );
}
