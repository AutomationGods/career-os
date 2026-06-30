import { getApplicationPacket } from "@career-os/domains";

export const dynamic = "force-dynamic";

export default function PacketDetailPage({ params }: { params: { id: string } }) {
  const packet = getApplicationPacket(params.id);

  if (!packet) {
    return (
      <main className="main">
        <h1>Packet Detail</h1>
        <div className="card">
          <strong>{params.id}</strong>
          <p className="muted">Packet not found in the local data store. Seed demo data from the dashboard, then open a packet link.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <span className="badge">Data-backed</span>
      <h1>Packet Detail</h1>
      <div className="grid">
        <div className="card">
          <strong>{packet.selectedJob.title}</strong>
          <p className="muted">{packet.selectedCompany?.name ?? packet.selectedJob.company}</p>
          <p>Status: {packet.status}</p>
          <p>Fit: {packet.fitScoreSummary.score} · {packet.fitScoreSummary.segment}</p>
        </div>
        <div className="card">
          <strong>Recruiter</strong>
          <p className="muted">{packet.selectedPerson?.name ?? "No recruiter selected"}</p>
          <p>{packet.selectedPerson?.email ?? "No email on packet"}</p>
        </div>
        <div className="card">
          <strong>Next action</strong>
          <p className="muted">{packet.nextAction}</p>
        </div>
      </div>

      <section className="section">
        <h2>Generated Placeholders</h2>
        <div className="grid">
          <div className="card"><strong>Resume</strong><p className="muted">{packet.resumePlaceholder ?? "Not generated yet."}</p></div>
          <div className="card"><strong>Cover Letter</strong><p className="muted">{packet.coverLetterPlaceholder ?? "Not generated yet."}</p></div>
          <div className="card"><strong>Recruiter Message</strong><p className="muted">{packet.recruiterMessagePlaceholder ?? "Not generated yet."}</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Notes</h2>
        <div className="card">
          {packet.notes.length > 0 ? <ul className="compact-list">{packet.notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="muted">No notes recorded.</p>}
        </div>
      </section>
    </main>
  );
}
