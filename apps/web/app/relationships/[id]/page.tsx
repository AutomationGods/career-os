import { getRelationshipPerson } from "@career-os/domains";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";

export const dynamic = "force-dynamic";

function displayName(value: string) {
  return value.replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function RelationshipDetailPage({ params }: { params: { id: string } }) {
  const person = getRelationshipPerson(params.id);

  if (!person) {
    return (
      <main className="main">
        <span className="badge">Relationship Intelligence Manager</span>
        <h1>Relationship Detail</h1>
        <div className="grid">
          <div className="card">
            <strong>{params.id}</strong>
            <p className="muted">Relationship not found in the local data store.</p>
          </div>
          <a className="card linked-card" href="/relationships">
            <strong>Open Relationships</strong>
            <p className="muted">Select an available relationship or create one from local data.</p>
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
    Promise.resolve(eventStore.listByEntity("person", person.id)),
    Promise.resolve(stateStore.listByEntity("person", person.id))
  ]);

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

      <section className="section">
        <h2>Recruiter Audit Trail</h2>
        <div className="grid">
          <div className="card">
            <strong>{events.length}</strong>
            <p className="muted">relationship events</p>
            {events.length > 0 ? <ul className="compact-list">{events.slice(0, 5).map((event) => <li key={event.id}>{displayName(event.eventType)} · {event.createdAt.toISOString()}</li>)}</ul> : <p className="muted">No relationship events recorded.</p>}
          </div>
          <div className="card">
            <strong>{projections.length}</strong>
            <p className="muted">state projections</p>
            {projections.length > 0 ? <ul className="compact-list">{projections.slice(0, 5).map((projection) => <li key={projection.id}>{displayName(projection.projectionType)} · {projection.updatedAt.toISOString()}</li>)}</ul> : <p className="muted">No relationship state projections recorded.</p>}
          </div>
          <a className="card linked-card" href="/resumes">
            <strong>Open Resume Factory</strong>
            <p className="muted">Generate the local Splunk/Cribl review draft without emailing, uploading, submitting, or applying.</p>
          </a>
        </div>
      </section>
    </main>
  );
}
