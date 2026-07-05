import { isRecord, numberText, strings, text, type UnknownRecord } from "./helpers";

export function ApplicationDraftSection({ busy, createPacket, opportunities, packets, selectedCanCreatePacket, selectedOpportunity, selectedOpportunityId, setSelectedOpportunityId }: { busy?: string; createPacket: () => void; opportunities: UnknownRecord[]; packets: UnknownRecord[]; selectedCanCreatePacket: boolean; selectedOpportunity?: UnknownRecord; selectedOpportunityId: string; setSelectedOpportunityId: (value: string) => void }) {
  return (
    <section className="section">
      <h2>D. Application Draft</h2>
      <div className="card form-card">
        <label>Selected job<select value={selectedOpportunityId} onChange={(event) => setSelectedOpportunityId(event.target.value)}>{opportunities.map((job) => <option key={text(job.id)} value={text(job.id)}>{text(job.title)} · {text(job.company)}</option>)}</select></label>
        <button type="button" disabled={Boolean(busy) || !selectedCanCreatePacket} onClick={() => createPacket()}>{busy === "Creating application draft" ? "Creating..." : "Create Application Draft"}</button>
        <p className="muted">We’ll draft only from facts found in your resume/profile.</p>
        {!selectedCanCreatePacket && selectedOpportunity ? <p className="muted">Jobs marked not a good match cannot create application drafts or resume drafts.</p> : null}
      </div>
      <div className="grid">
        {packets.slice(0, 4).map((packet) => (
          <div className="card" key={text(packet.id)}>
            <strong>{text(isRecord(packet.selectedJob) ? packet.selectedJob.title : undefined)}</strong>
            <p>Status: {text(packet.status)}</p>
            <p>Resume safety check: {isRecord(packet.truthfulnessSummary) ? `${numberText(packet.truthfulnessSummary.usedFactCount)} facts used, ${numberText(packet.truthfulnessSummary.blockedClaimCount)} blocked` : "pending"}</p>
            <p>Needs proof: {strings(packet.missingEvidence).join(", ") || "none listed"}</p>
            <p>Next: {text(packet.nextAction)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
