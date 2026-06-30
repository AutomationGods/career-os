import { getRelationshipPerson } from "@career-os/domains";

export const dynamic = "force-dynamic";

export default function RelationshipDetailPage({ params }: { params: { id: string } }) {
  const person = getRelationshipPerson(params.id);

  if (!person) {
    return (
      <main className="main">
        <h1>Relationship Detail</h1>
        <div className="card">
          <strong>{params.id}</strong>
          <p className="muted">Relationship not found in the local data store. Seed demo data from the dashboard, then open a relationship link.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <span className="badge">Data-backed</span>
      <h1>Relationship Detail</h1>
      <div className="grid">
        <div className="card">
          <strong>{person.name}</strong>
          <p className="muted">{person.company ?? "Unknown company"}</p>
          <p>{person.roles.join(", ")}</p>
        </div>
        <div className="card">
          <strong>Scores</strong>
          <p>Relevance: {person.relevanceScore}</p>
          <p>Responsiveness: {person.responsivenessScore}</p>
          <p>Trust: {person.trustScore}</p>
        </div>
        <div className="card">
          <strong>Follow-up</strong>
          <p className="muted">Last contact: {person.lastContactedAt ?? "not recorded"}</p>
          <p className="muted">Next follow-up: {person.nextFollowupAt ?? "not scheduled"}</p>
        </div>
      </div>

      <section className="section">
        <h2>Contact Points</h2>
        <div className="grid">
          <div className="card"><strong>Emails</strong>{person.emails.length > 0 ? <ul className="compact-list">{person.emails.map((email) => <li key={email}>{email}</li>)}</ul> : <p className="muted">No emails.</p>}</div>
          <div className="card"><strong>Phones</strong>{person.phones.length > 0 ? <ul className="compact-list">{person.phones.map((phone) => <li key={phone}>{phone}</li>)}</ul> : <p className="muted">No phones.</p>}</div>
        </div>
      </section>
    </main>
  );
}
