import { requireAuthenticatedCareerUser } from "../api/_lib/auth";
import { listPersistentApplicationPackets } from "../api/_lib/persistent-state";

export const dynamic = "force-dynamic";

const sections = [
  { status: "ready_to_generate", label: "Ready to draft" },
  { status: "awaiting_review", label: "Needs review" },
  { status: "ready_to_apply", label: "Ready to apply" },
  { status: "followup_due", label: "Follow-up due" },
  { status: "closed", label: "Closed" }
];

export default async function ApplicationPacketsPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const packets = await listPersistentApplicationPackets(authUser.userId);

  return (
    <main className="main">
      <span className="badge">Saved applications</span>
      <h1>Applications</h1>
      <p className="muted">Review application drafts, resume drafts, notes, status, and next actions.</p>

      <section className="section">
        <h2>Status Overview</h2>
        <div className="grid">
          {sections.map((section) => (
            <div className="card" key={section.status}>
              <strong>{packets.filter((packet) => packet.status === section.status).length}</strong>
              <br />
              <span className="muted">{section.label}</span>
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
            <p className="muted">No applications yet. Open Command Center, find a job match, then create an application draft.</p>
            <p><a href="/career-command">Open Command Center →</a></p>
          </div>
        )}
      </section>
    </main>
  );
}
