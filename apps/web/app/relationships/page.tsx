import { readFeatureFlags } from "@career-os/config";
import { requirePageUser } from "../_lib/page-auth";

const roles = ["recruiter", "hiring_manager", "interviewer", "referral", "hr", "unknown"];

export default async function RelationshipsPage() {
  await requirePageUser();

  if (!readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS) {
    return <main className="main"><h1>Relationships</h1><div className="card"><strong>Coming later</strong><p className="muted">Relationship intelligence is roadmap inventory. The launch MVP focuses on Jobs, Application Packets, Profile Facts, Resumes, Documents, and manual status tracking.</p></div></main>;
  }

  return <main className="main"><h1>Relationships</h1><p className="muted">People are deduplicated by email, normalized name + company, and phone number.</p><div className="grid">{roles.map((role) => <div className="card" key={role}><strong>{role}</strong><p className="muted">Relationship score placeholders tracked.</p></div>)}</div></main>;
}
