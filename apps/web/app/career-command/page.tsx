import CareerCommandPanel from "./panel";

export const dynamic = "force-dynamic";

export default function CareerCommandPage() {
  return (
    <main className="main">
      <span className="badge">Job-search command center</span>
      <h1>Command Center</h1>
      <p className="muted">Upload a resume, build your job-search profile, find job matches, create an application draft, and generate today’s plan. No auto-apply, email sending, browser automation, LinkedIn scraping, or external uploads run here.</p>
      <CareerCommandPanel />
    </main>
  );
}
