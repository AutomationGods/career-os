import ProfileFactsPanel from "./profile-facts-panel";

export const dynamic = "force-dynamic";

export default function ProfileFactsPage() {
  return (
    <main className="main">
      <span className="badge">Source of truth</span>
      <h1>Profile Facts</h1>
      <p className="muted">Verified source-of-truth facts used by Resume Factory.</p>
      <ProfileFactsPanel />
    </main>
  );
}
