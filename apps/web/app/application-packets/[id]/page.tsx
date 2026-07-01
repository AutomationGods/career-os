import { requireAuthenticatedCareerUser } from "../../api/_lib/auth";
import { getPersistentApplicationPacket, listPersistentResumeDraftProjections } from "../../api/_lib/persistent-state";
import PacketResumeAction from "./packet-resume-action";
import PacketStatusAction from "./packet-status-action";

export const dynamic = "force-dynamic";

export default async function PacketDetailPage({ params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  const [packet, resumeDrafts] = await Promise.all([
    getPersistentApplicationPacket(authUser.userId, params.id),
    listPersistentResumeDraftProjections(authUser.userId)
  ]);
  const latestDraft = resumeDrafts.find((draft) => draft.entityId === params.id);

  if (!packet) {
    return (
      <main className="main">
        <span className="badge">Application Packet Manager</span>
        <h1>Packet Detail</h1>
        <div className="grid">
          <div className="card">
            <strong>{params.id}</strong>
            <p className="muted">Packet not found in the local data store.</p>
          </div>
          <a className="card linked-card" href="/application-packets">
            <strong>Open Application Packets</strong>
            <p className="muted">Select an available packet or create one from local data.</p>
          </a>
          <a className="card linked-card" href="/#data-touchpoints">
            <strong>Seed Local Data</strong>
            <p className="muted">Create a job, packet, relationship, resume draft, events, state, and snapshots.</p>
          </a>
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
        <PacketStatusAction packetId={packet.id} status={packet.status} />
      </div>

      <PacketResumeAction packet={packet} />

      <section className="section">
        <h2>Generated Drafts</h2>
        <div className="grid">
          <div className="card">
            <strong>Resume</strong>
            <p className="muted">{packet.resumePlaceholder ?? "Use the packet-specific generator above for a grounded draft."}</p>
            {latestDraft ? <p><a href={`/api/application-packets/${packet.id}/resume/export`}>Export latest markdown draft locally</a></p> : null}
          </div>
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
