import { requirePageUser } from "../_lib/page-auth";
import ApplicationPacketsPanel from "./application-packets-panel";

export default async function ApplicationPacketsPage() {
  await requirePageUser();

  return (
    <main className="main">
      <span className="badge">MVP apply loop</span>
      <h1>Application Packets</h1>
      <p className="muted">Create durable job application workspaces, generate review-required drafts, and track manual status.</p>
      <ApplicationPacketsPanel />
    </main>
  );
}
