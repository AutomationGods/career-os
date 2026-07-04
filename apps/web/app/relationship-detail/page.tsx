import { redirect } from "next/navigation";
import { requireAuthenticatedCareerUser } from "../api/_lib/auth";
import { listPersistentRelationshipPeople } from "../api/_lib/persistent-state";

export const dynamic = "force-dynamic";

export default async function RelationshipDetailManagerPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const person = (await listPersistentRelationshipPeople(authUser.userId))[0];

  if (person) {
    redirect(`/relationships/${person.id}`);
  }

  return (
    <main className="main">
      <span className="badge">Contact</span>
      <h1>Contact Detail</h1>
      <p className="muted">Contact detail opens from the contact list once a person record exists.</p>
      <div className="grid">
        <a className="card linked-card" href="/relationships">
          <strong>Open Contacts</strong>
          <p className="muted">Select a contact, then open the detail record.</p>
        </a>
        <a className="card linked-card" href="/career-command">
          <strong>Open Command Center</strong>
          <p className="muted">Find jobs and create application drafts.</p>
        </a>
      </div>
    </main>
  );
}
