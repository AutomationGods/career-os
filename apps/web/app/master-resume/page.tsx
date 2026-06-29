import { requirePageUser } from "../_lib/page-auth";
import MasterResumePanel from "./master-resume-panel";

export const dynamic = "force-dynamic";

export default async function MasterResumePage() {
  await requirePageUser();

  return (
    <main className="main">
      <span className="badge">Source of truth</span>
      <h1>Master Resume Import</h1>
      <p className="muted">Paste plain-text resume content, parse deterministic candidate Profile Facts, and verify or block them before Resume Factory can use them.</p>
      <p><a href="/profile-facts">Review all Profile Facts</a> · <a href="/resumes">Open Resume Factory</a></p>
      <MasterResumePanel />
    </main>
  );
}
