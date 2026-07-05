import { List } from "./list-components";
import { manualSearchSites, strings, type UnknownRecord } from "./helpers";

type ManualJob = { title: string; company: string; source: string; applyUrl: string; location: string; remoteStatus: string; employmentType: string; salaryText: string; jobDescription: string };

type JobImportSectionProps = {
  activeSearchQueries: string[];
  bulkText: string;
  busy?: string;
  certificationSearchKeywords: string[];
  ignoredResumeLinesForSearch: string[];
  manualJob: ManualJob;
  profile?: UnknownRecord;
  profileSearchDiagnostics?: UnknownRecord;
  readyJobSearchTerms: string[];
  searchHelperQueries: string[];
  sourceDiagnostics?: UnknownRecord;
  findJobMatches: () => void;
  importBulkJobs: () => void;
  importManualJob: () => void;
  setBulkText: (value: string) => void;
  setManualJob: (value: ManualJob) => void;
};

export function JobImportSection(props: JobImportSectionProps) {
  const { activeSearchQueries, bulkText, busy, certificationSearchKeywords, ignoredResumeLinesForSearch, manualJob, profile, profileSearchDiagnostics, readyJobSearchTerms, searchHelperQueries, sourceDiagnostics, findJobMatches, importBulkJobs, importManualJob, setBulkText, setManualJob } = props;

  return (
    <>
      <section className="section">
        <h2>C. Find Job Matches</h2>
        <details className="card">
          <summary>Search details</summary>
          <div className="grid">
            <div className="card"><strong>Active sources</strong><List items={strings(sourceDiagnostics?.enabledSources).length > 0 ? strings(sourceDiagnostics?.enabledSources) : ["Remotive public API", "Manual Job Import"]} /></div>
            <div className="card"><strong>Off-limits sources</strong><List items={strings(sourceDiagnostics?.disabledSources).length > 0 ? strings(sourceDiagnostics?.disabledSources) : ["LinkedIn scraping", "Indeed scraping", "Dice scraping", "ClearanceJobs scraping", "Gmail", "Google Calendar", "browser automation", "auto-apply", "CAPTCHA bypass"]} /></div>
            <div className="card"><strong>Search terms</strong><p>Ready job search terms:</p><List items={readyJobSearchTerms} /><p>Last public job query:</p><List items={activeSearchQueries} /></div>
            <div className="card"><strong>Safety filters</strong><p>Companies not searched:</p><List items={strings(profileSearchDiagnostics?.companiesExcludedFromSearch)} /><p>Certifications used as search keywords:</p><List items={certificationSearchKeywords} /><p>Resume lines ignored as search queries:</p><List items={ignoredResumeLinesForSearch} /></div>
          </div>
        </details>
        <p><button type="button" disabled={Boolean(busy) || !profile} onClick={() => findJobMatches()}>{busy === "Finding job matches" ? "Finding..." : "Find Job Matches"}</button></p>
      </section>

      <section className="section">
        <h2>Add a Job Manually</h2>
        <div className="card form-card">
          <label>Job title<input value={manualJob.title} onChange={(event) => setManualJob({ ...manualJob, title: event.target.value })} placeholder="Splunk Architect" /></label>
          <label>Company<input value={manualJob.company} onChange={(event) => setManualJob({ ...manualJob, company: event.target.value })} placeholder="unknown is OK" /></label>
          <label>Source<input value={manualJob.source} onChange={(event) => setManualJob({ ...manualJob, source: event.target.value })} placeholder="LinkedIn, Dice, company careers, recruiter email" /></label>
          <label>Apply URL<input value={manualJob.applyUrl} onChange={(event) => setManualJob({ ...manualJob, applyUrl: event.target.value })} placeholder="Paste the apply URL; no scraping runs" /></label>
          <label>Location<input value={manualJob.location} onChange={(event) => setManualJob({ ...manualJob, location: event.target.value })} placeholder="Remote, Washington DC, unknown" /></label>
          <label>Remote status<select value={manualJob.remoteStatus} onChange={(event) => setManualJob({ ...manualJob, remoteStatus: event.target.value })}><option value="unknown">unknown</option><option value="remote">remote</option><option value="hybrid">hybrid</option><option value="onsite">onsite</option></select></label>
          <label>Employment type<input value={manualJob.employmentType} onChange={(event) => setManualJob({ ...manualJob, employmentType: event.target.value })} placeholder="full-time, contract, unknown" /></label>
          <label>Salary text<input value={manualJob.salaryText} onChange={(event) => setManualJob({ ...manualJob, salaryText: event.target.value })} placeholder="Leave blank if unknown" /></label>
          <label>Pasted job description<textarea rows={10} value={manualJob.jobDescription} onChange={(event) => setManualJob({ ...manualJob, jobDescription: event.target.value })} placeholder="Paste the real job description here. Career OS will score it, not scrape it." /></label>
          <button type="button" disabled={Boolean(busy) || (!manualJob.title.trim() && !manualJob.jobDescription.trim())} onClick={() => importManualJob()}>{busy === "Importing manual job" ? "Importing..." : "Import Job"}</button>
          <p className="muted">Unknown salary, clearance, certification requirements, and company facts stay unknown unless present in your pasted job text.</p>
        </div>
      </section>

      <section className="section">
        <h2>Paste Multiple Jobs</h2>
        <div className="card form-card">
          <label>Paste multiple job blurbs<textarea rows={8} value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={"Use clearly separated chunks with Title: and Company: labels. If Career OS is uncertain, it imports one batch for review instead of inventing multiple jobs."} /></label>
          <button type="button" disabled={Boolean(busy) || bulkText.trim().length < 20} onClick={() => importBulkJobs()}>{busy === "Importing bulk jobs" ? "Importing..." : "Import Bulk Paste"}</button>
        </div>
      </section>

      <section className="section">
        <h2>Search These Sites Manually</h2>
        <div className="grid">
          <div className="card"><strong>Copy/paste search strings</strong><List items={searchHelperQueries} /></div>
          <div className="card"><strong>Suggested sites to search manually</strong><List items={manualSearchSites} /><p className="muted">This helper does not scrape sites. It only gives search strings for you to copy and paste.</p></div>
        </div>
      </section>
    </>
  );
}
