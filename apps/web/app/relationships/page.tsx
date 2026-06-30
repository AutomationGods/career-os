import { listRelationshipPeople, type PersonRole } from "@career-os/domains";

export const dynamic = "force-dynamic";

const roles: PersonRole[] = ["recruiter", "hiring_manager", "interviewer", "referral", "hr", "unknown"];

export default function RelationshipsPage() {
  const people = listRelationshipPeople();

  return (
    <main className="main">
      <span className="badge">Data-backed</span>
      <h1>Relationships</h1>
      <p className="muted">People are deduplicated by email, normalized name + company, and phone number.</p>

      <section className="section">
        <h2>Role Overview</h2>
        <div className="grid">
          {roles.map((role) => (
            <div className="card" key={role}>
              <strong>{people.filter((person) => person.roles.includes(role)).length}</strong>
              <br />
              <span className="muted">{role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>People</h2>
        {people.length > 0 ? (
          <div className="grid">
            {people.map((person) => (
              <a className="card linked-card" href={`/relationships/${person.id}`} key={person.id}>
                <strong>{person.name}</strong>
                <p className="muted">{person.company ?? "Unknown company"}</p>
                <p>{person.roles.join(", ")}</p>
                <p className="muted">Next follow-up: {person.nextFollowupAt ?? "not scheduled"}</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="card">
            <p className="muted">No relationships yet. Open the dashboard and click “Seed Demo Data Touchpoints” to create a deduped recruiter record.</p>
          </div>
        )}
      </section>
    </main>
  );
}
