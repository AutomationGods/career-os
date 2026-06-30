import { listRelationshipPeople } from "@career-os/domains";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RelationshipDetailManagerPage() {
  const person = listRelationshipPeople()[0];

  if (person) {
    redirect(`/relationships/${person.id}`);
  }

  return (
    <main className="main">
      <span className="badge">Relationship Intelligence Manager</span>
      <h1>Relationship Detail</h1>
      <p className="muted">Relationship detail opens from the relationship list once a person record exists.</p>
      <div className="grid">
        <a className="card linked-card" href="/relationships">
          <strong>Open Relationships</strong>
          <p className="muted">Create or select a relationship, then open the detail record.</p>
        </a>
        <a className="card linked-card" href="/#data-touchpoints">
          <strong>Seed Local Data</strong>
          <p className="muted">Run the local data flow to create a deduped recruiter record and related audit data.</p>
        </a>
      </div>
    </main>
  );
}
