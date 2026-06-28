import JobsPanel from "./jobs-panel";

export default function JobsPage() {
  return (
    <main className="main">
      <span className="badge">B1 manual persisted job discovery</span>
      <h1>Jobs</h1>
      <p className="muted">Persist pasted job data, run local segmentation/scoring, and reuse job IDs for packets and resumes.</p>
      <JobsPanel />
    </main>
  );
}
