import { numberText, strings, text, type UnknownRecord } from "./helpers";

export function JobMatchesSection({ opportunities, selectedOpportunityId, setSelectedOpportunityId }: { opportunities: UnknownRecord[]; selectedOpportunityId: string; setSelectedOpportunityId: (value: string) => void }) {
  return (
    <section className="section">
      <h2>Job Matches</h2>
      <div className="grid">
        {opportunities.length === 0 ? <div className="card"><p className="muted">No job matches yet. Build your job-search profile, then click Find Job Matches.</p></div> : opportunities.map((job) => (
          <div className="card" key={text(job.id)}>
            <strong>{text(job.title)}</strong>
            <p className="muted">{text(job.company)} · {text(job.source)} · {text(job.location)} · {text(job.remoteStatus)}</p>
            <p>Match score: {numberText(job.fitScore)} · Effort: {text(job.applicationDifficulty)} · Result: {job.fitGatePassed === false ? "not a good match" : "good enough to review"}</p>
            <p>Why it matches: {strings(job.matchedStrongKeywords).join(", ") || "none"}</p>
            <p>Weak signals: {strings(job.matchedWeakKeywords).join(", ") || "none"}</p>
            <p>Why it may be weak: {strings(job.missingRequiredContext).join(", ") || "none"}</p>
            <p>Missing skills/evidence: {strings(job.missingSkills).join(", ") || "none"}</p>
            <p>Risks: {strings(job.risks).join(", ") || "none flagged"}</p>
            <p>Rejection reason: {text(job.rejectionReason, "none")}</p>
            <p>Salary: {text(job.salaryText)}</p>
            <p>Next: {text(job.nextAction)}</p>
            <label><input type="radio" checked={selectedOpportunityId === job.id} onChange={() => setSelectedOpportunityId(text(job.id, ""))} /> Select for application draft</label>
          </div>
        ))}
      </div>
    </section>
  );
}
