import { redirect } from "next/navigation";
import { requireAuthenticatedCareerUser } from "../api/_lib/auth";
import { listPersistentApplicationPackets } from "../api/_lib/persistent-state";

export const dynamic = "force-dynamic";

export default async function PacketDetailManagerPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const packet = (await listPersistentApplicationPackets(authUser.userId))[0];

  if (packet) {
    redirect(`/application-packets/${packet.id}`);
  }

  return (
    <main className="main">
      <span className="badge">Application draft</span>
      <h1>Application Detail</h1>
      <p className="muted">Application detail opens from the application list once a draft exists.</p>
      <div className="grid">
        <a className="card linked-card" href="/application-packets">
          <strong>Open Applications</strong>
          <p className="muted">Select an application draft, then open the detail record.</p>
        </a>
        <a className="card linked-card" href="/career-command">
          <strong>Open Command Center</strong>
          <p className="muted">Find a job match and create an application draft.</p>
        </a>
      </div>
    </main>
  );
}
