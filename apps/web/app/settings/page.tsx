import { requirePageUser } from "../_lib/page-auth";
import PrivacyControls from "./PrivacyControls";

const deleteConfirmation = "DELETE_MY_CAREER_OS_DATA";

export default async function SettingsPage() {
  await requirePageUser();

  return (
    <main className="main">
      <span className="badge">Account settings</span>
      <h1>Settings</h1>
      <p className="muted">Public-launch controls for account privacy, export, and deletion.</p>
      <PrivacyControls deleteConfirmation={deleteConfirmation} />
      <section className="section">
        <h2>Launch privacy policy</h2>
        <div className="card">
          <strong>Manual-safe data posture</strong>
          <p className="muted">Career OS stores only the job, application, resume, document, event, state, snapshot, and approval data needed for your manual apply loop.</p>
          <p className="muted">Legal documents remain placeholders until lawyer review is complete; see docs/PRIVACY-LAUNCH-CHECKLIST.md before public launch.</p>
        </div>
      </section>
    </main>
  );
}
