import { strings, type UnknownRecord } from "./helpers";
import { List } from "./list-components";
import { ProfileCounts } from "./resume-upload-section";

export function ProfileSummarySection({ busy, claimCount, documentCount, factCount, profile, buildCareerProfile }: { busy?: string; claimCount: number; documentCount: number; factCount: number; profile?: UnknownRecord; buildCareerProfile: () => void }) {
  return (
    <section className="section">
      <h2>B. Build Job-Search Profile</h2>
      <ProfileCounts claimCount={claimCount} documentCount={documentCount} factCount={factCount} />
      <p><button type="button" disabled={Boolean(busy) || documentCount === 0} onClick={() => buildCareerProfile()}>{busy === "Building job-search profile" ? "Building..." : "Build My Job-Search Profile"}</button></p>
      <div className="grid">
        <div className="card"><strong>Target roles</strong><List items={strings(profile?.targetTitles)} /></div>
        <div className="card"><strong>Strongest skills</strong><List items={strings(profile?.strongestSkills)} /></div>
        <div className="card"><strong>Strongest tools</strong><List items={strings(profile?.strongestTools)} /></div>
        <div className="card"><strong>Strongest domains</strong><p>{strings(profile?.strongestDomains).join(", ") || "None yet."}</p></div>
        <div className="card"><strong>Search keywords</strong><List items={strings(profile?.suggestedJobSearchKeywords)} /></div>
        <div className="card"><strong>Needs proof</strong><List items={strings(profile?.missingEvidence)} /></div>
        <div className="card"><strong>Avoid using</strong><List items={strings(profile?.claimsToAvoid)} /></div>
      </div>
    </section>
  );
}
