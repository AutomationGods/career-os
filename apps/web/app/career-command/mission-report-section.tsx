import { isRecord, numberText, records, strings, text, type UnknownRecord } from "./helpers";
import { List } from "./list-components";

export function ReportHelpSection({ busy, copyCareerCommandReport, copyConfirmation }: { busy?: string; copyCareerCommandReport: () => void; copyConfirmation: string }) {
  return (
    <section className="section">
      <div className="card form-card">
        <strong>Need help?</strong>
        <p className="muted">Click this after upload, profile, jobs, or plan actions, then paste the copied report into chat.</p>
        <button type="button" disabled={Boolean(busy)} onClick={() => copyCareerCommandReport()}>Copy Command Center Report</button>
        {copyConfirmation ? <p className="badge" role="status">{copyConfirmation}</p> : null}
      </div>
    </section>
  );
}

export function MissionSection({ busy, finalResumeReviewItems, generateMission, mission }: { busy?: string; finalResumeReviewItems: string[]; generateMission: () => void; mission?: UnknownRecord }) {
  return (
    <>
      <section className="section">
        <h2>E. Today’s Plan</h2>
        <p><button type="button" disabled={Boolean(busy)} onClick={() => generateMission()}>{busy === "Generating today’s plan" ? "Generating..." : "Generate Today’s Plan"}</button></p>
        <div className="grid">
          <div className="card"><strong>Next best action</strong><p>{text(mission?.highestLeverageNextAction, "Generate a plan after finding job matches.")}</p></div>
          <div className="card"><strong>Jobs to apply to today</strong><List items={records(mission?.topJobsToApplyToday).map((job) => `${text(job.title)} · ${text(job.company)} · Match ${numberText(job.fitScore)}`)} /></div>
          <div className="card"><strong>Drafts to finish</strong><List items={records(mission?.packetsToFinish).map((packet) => `${text(isRecord(packet.selectedJob) ? packet.selectedJob.title : undefined)} · ${text(packet.status)}`)} /></div>
          <div className="card"><strong>Resume drafts</strong><List items={strings(mission?.resumeVariantsToGenerate)} /></div>
          <div className="card"><strong>Proof to gather</strong><List items={strings(mission?.missingEvidenceToGather)} /></div>
          <div className="card"><strong>Follow-ups due</strong><List items={records(mission?.followupsDue).map((person) => text(person.name))} /></div>
        </div>
      </section>

      <section className="section warning-card">
        <h2>F. Final Resume Review</h2>
        <p className="muted">Review these resume findings before treating the Command Center as complete.</p>
        <List items={finalResumeReviewItems} />
      </section>
    </>
  );
}
