import type { PersonRole } from "@career-os/domains";
import { requireAuthenticatedCareerUser } from "../api/_lib/auth";
import { listPersistentRelationshipPeople } from "../api/_lib/persistent-state";

export const dynamic = "force-dynamic";

const roles: PersonRole[] = ["recruiter", "hiring_manager", "interviewer", "referral", "hr", "unknown"];

export default async function RelationshipsPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const people = await listPersistentRelationshipPeople(authUser.userId);

  return (
    <main className="main">
      <span className="badge">Contacts</span>
      <h1>Contacts</h1>
      <p className="muted">Track recruiters, hiring managers, interviewers, and referral contacts.</p>

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
            <p className="muted">No contacts yet. Contacts will appear here when you add or import recruiter details from applications.</p>
          </div>
        )}
      </section>
    </main>
  );
}
