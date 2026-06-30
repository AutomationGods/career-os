import { listApplicationPackets } from "@career-os/domains";

export const dynamic = "force-dynamic";

const sections = ["ready_to_generate", "awaiting_review", "ready_to_apply", "followup_due", "closed"];

export default function ApplicationPacketsPage() {
  const packets = listApplicationPackets();

  return (
    <main className="main">
      <span className="badge">Data-backed</span>
      <h1>Application Packets</h1>
      <p className="muted">Packets connect jobs, companies, recruiters, fit summaries, generated drafts, notes, status, and next action.</p>

      <section className="section">
        <h2>Status Overview</h2>
        <div className="grid">
          {sections.map((section) => (
            <div className="card" key={section}>
              <strong>{packets.filter((packet) => packet.status === section).length}</strong>
              <br />
              <span className="muted">{section}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Packets</h2>
        {packets.length > 0 ? (
          <div className="grid">
            {packets.map((packet) => (
              <a className="card linked-card" href={`/application-packets/${packet.id}`} key={packet.id}>
                <strong>{packet.selectedJob.title}</strong>
                <p className="muted">{packet.selectedCompany?.name ?? packet.selectedJob.company}</p>
                <p>Status: {packet.status}</p>
                <p className="muted">Next: {packet.nextAction}</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="card">
            <p className="muted">No packets yet. Open the dashboard and click “Seed Demo Data Touchpoints” to create one.</p>
          </div>
        )}
      </section>
    </main>
  );
}
