import { requirePageUser } from "../_lib/page-auth";
import ProfileFactsPanel from "./profile-facts-panel";

export const dynamic = "force-dynamic";

export default async function ProfileFactsPage() {
  await requirePageUser();

  return (
    <main className="main">
      <span className="badge">Source of truth</span>
      <h1>Profile Facts</h1>
      <p className="muted">Verified source-of-truth facts used by Resume Factory.</p>
      <p><a href="/master-resume">Import candidate facts from Master Resume</a> · <a href="/resumes">Open Resume Factory</a></p>
      <ProfileFactsPanel />
    </main>
  );
}
