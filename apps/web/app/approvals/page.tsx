import { prismaApprovalRequestService } from "@career-os/orchestration";

async function getApprovals() {
  try {
    return await prismaApprovalRequestService.list();
  } catch {
    return [];
  }
}

export default async function ApprovalsPage() {
  const approvals = await getApprovals();
  const pending = approvals.filter((approval) => approval.status === "pending");
  const approved = approvals.filter((approval) => approval.status === "approved");
  const rejected = approvals.filter((approval) => approval.status === "rejected");

  return (
    <main className="main">
      <h1>Approval Requests</h1>
      <p className="muted">Sensitive commands wait here for human approval before execution.</p>
      <div className="grid">
        <div className="card"><strong>{pending.length}</strong><p className="muted">pending approvals</p></div>
        <div className="card"><strong>{approved.length}</strong><p className="muted">approved approvals</p></div>
        <div className="card"><strong>{rejected.length}</strong><p className="muted">rejected approvals</p></div>
      </div>
      <section className="section">
        <h2>Requests</h2>
        <div className="grid">
          {approvals.map((approval) => (
            <div className="card" key={approval.id}>
              <strong>{approval.commandType}</strong>
              <p className="muted">Permission: {approval.permission}</p>
              <p className="muted">Risk: {approval.riskLevel}</p>
              <p className="muted">Status: {approval.status}</p>
              <p className="muted">Entity: {approval.entityType ?? "n/a"} / {approval.entityId ?? "n/a"}</p>
              <p className="muted">Reason: {approval.reason}</p>
              <p className="muted">Requested: {approval.requestedAt.toISOString()}</p>
            </div>
          ))}
          {approvals.length === 0 ? <div className="card">No approval requests yet.</div> : null}
        </div>
      </section>
    </main>
  );
}
