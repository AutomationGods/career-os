import { requireAuthenticatedCareerUser } from "../../api/_lib/auth";
import { getPersistentRelationshipPerson, listPersistentEntityEvents, listPersistentEntityProjections } from "../../api/_lib/persistent-state";

export const dynamic = "force-dynamic";

function displayName(value: string) {
  return value.replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function RelationshipDetailPage({ params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  const person = await getPersistentRelationshipPerson(authUser.userId, params.id);

  if (!person) {
    return (
      <main className="main">
        <span className="badge">Contact</span>
        <h1>Contact Detail</h1>
        <div className="grid">
          <div className="card">
            <strong>{params.id}</strong>
            <p className="muted">Contact not found.</p>
          </div>
          <a className="card linked-card" href="/relationships">
            <strong>Open Contacts</strong>
            <p className="muted">Select an available contact.</p>
          </a>
          <a className="card linked-card" href="/#data-touchpoints">
            <strong>Seed Local Data</strong>
            <p className="muted">Create a deduped recruiter record and related audit data.</p>
          </a>
        </div>
      </main>
    );
  }

  const [events, projections] = await Promise.all([
    listPersistentEntityEvents(authUser.userId, "person", person.id),
    listPersistentEntityProjections(authUser.userId, "person", person.id)
  ]);

  return (
    <main className="main">
      <span className="badge">Contact</span>
      <h1>Contact Detail</h1>
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

      <section className="section">
        <h2>Contact History</h2>
        <div className="grid">
          <div className="card">
            <strong>{events.length}</strong>
            <p className="muted">contact updates</p>
            {events.length > 0 ? <ul className="compact-list">{events.slice(0, 5).map((event) => <li key={event.id}>{displayName(event.eventType)} · {event.createdAt.toISOString()}</li>)}</ul> : <p className="muted">No contact updates recorded.</p>}
          </div>
          <div className="card">
            <strong>{projections.length}</strong>
            <p className="muted">saved records</p>
            {projections.length > 0 ? <ul className="compact-list">{projections.slice(0, 5).map((projection) => <li key={projection.id}>{displayName(projection.projectionType)} · {projection.updatedAt.toISOString()}</li>)}</ul> : <p className="muted">No saved contact records found.</p>}
          </div>
          <a className="card linked-card" href="/career-command">
            <strong>Open Command Center</strong>
            <p className="muted">Find jobs and create application drafts without emailing, uploading, submitting, or applying.</p>
          </a>
        </div>
      </section>
    </main>
  );
}
