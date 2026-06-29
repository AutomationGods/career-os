"use client";

import { useMemo, useState } from "react";
import {
  approvalsFromEnvelope,
  commandSummaryFromEnvelope,
  countApprovals,
  type ApprovalCounts,
  type ApprovalView,
  type CommandSummary
} from "./approval-test-panel-model";

interface ApprovalTestPanelProps {
  initialApprovals: ApprovalView[];
  showDevCommandControls: boolean;
}

type LoadingAction = "refresh" | "allowed" | "requires-approval" | "denied" | "approve" | "reject" | "cancel" | "replay";

type ApprovalDecision = "approve" | "reject" | "cancel";

const decisionPastTense: Record<ApprovalDecision, string> = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled"
};

const devCommandRoutes: Record<"allowed" | "requires-approval" | "denied", string> = {
  allowed: "/api/dev/commands/allowed",
  "requires-approval": "/api/dev/commands/requires-approval",
  denied: "/api/dev/commands/denied"
};

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function statusLabel(loadingAction: LoadingAction | null) {
  if (!loadingAction) return "Idle";
  if (loadingAction === "requires-approval") return "Creating approval request";
  return `${loadingAction.replace("-", " ")} in progress`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function CountCards({ counts }: { counts: ApprovalCounts }) {
  return (
    <div className="grid" aria-label="Approval request counts">
      <div className="card"><strong>{counts.pending}</strong><p className="muted">pending approvals</p></div>
      <div className="card"><strong>{counts.approved}</strong><p className="muted">approved approvals</p></div>
      <div className="card"><strong>{counts.rejected}</strong><p className="muted">rejected approvals</p></div>
      <div className="card"><strong>{counts.cancelled}</strong><p className="muted">cancelled approvals</p></div>
    </div>
  );
}

function LatestCommandResult({ summary }: { summary?: CommandSummary }) {
  if (!summary) return <p className="muted">Latest command result: none yet.</p>;

  return (
    <div className="card" aria-live="polite">
      <strong>Latest command result</strong>
      <p className="muted">Status: {summary.status ?? "unknown"}</p>
      <p className="muted">Command: {summary.commandId ?? "n/a"}</p>
      {summary.approvalRequestId ? <p className="muted">Approval request: {summary.approvalRequestId}</p> : null}
    </div>
  );
}

function LatestErrorResult({ summary }: { summary?: CommandSummary }) {
  if (!summary?.errorCode && !summary?.errorMessage) return <p className="muted">Latest error result: none.</p>;

  return (
    <div className="card" aria-live="polite">
      <strong>Latest error result</strong>
      <p className="muted">Code: {summary.errorCode ?? "unknown"}</p>
      <p className="muted">Message: {summary.errorMessage ?? "No message"}</p>
    </div>
  );
}

export default function ApprovalTestPanel({ initialApprovals, showDevCommandControls }: ApprovalTestPanelProps) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(null);
  const [successMessage, setSuccessMessage] = useState("Ready to exercise approval policy.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestCommandResult, setLatestCommandResult] = useState<CommandSummary | undefined>(undefined);
  const [latestErrorResult, setLatestErrorResult] = useState<CommandSummary | undefined>(undefined);
  const counts = useMemo(() => countApprovals(approvals), [approvals]);
  const isLoading = loadingAction !== null;

  async function refreshApprovals() {
    const response = await fetch("/api/approvals", { cache: "no-store" });
    const body = await readJson(response);
    if (!response.ok) throw new Error("Could not refresh approval requests.");
    setApprovals(approvalsFromEnvelope(body));
  }

  async function runDevCommand(kind: "allowed" | "requires-approval" | "denied") {
    setLoadingAction(kind);
    setErrorMessage(null);
    setSuccessMessage("Running demo command through the Command Bus and Orchestrator...");

    try {
      const response = await fetch(devCommandRoutes[kind], { method: "POST" });
      const body = await readJson(response);
      const summary = commandSummaryFromEnvelope(body);
      if (!summary) throw new Error("Dev command returned an unexpected response envelope.");

      setLatestCommandResult(summary);
      setLatestErrorResult(summary.ok ? undefined : summary);
      await refreshApprovals();

      if (kind === "requires-approval") {
        setSuccessMessage(`Requires approval command stopped safely. Pending request ${summary.approvalRequestId ?? "created"} is now in the list.`);
      } else if (kind === "denied") {
        setSuccessMessage("Denied command was rejected by policy before execution.");
      } else {
        setSuccessMessage("Allowed command completed without creating an approval request.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown dev command failure.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function replayApproval(id: string) {
    setLoadingAction("replay");
    setErrorMessage(null);
    setSuccessMessage("Replay submitted through Approval Service, Command Bus, and Orchestrator...");

    try {
      const response = await fetch(`/api/approvals/${id}/replay`, { method: "POST" });
      const body = await readJson(response);
      const summary = commandSummaryFromEnvelope(body);
      if (summary) {
        setLatestCommandResult(summary);
        setLatestErrorResult(summary.ok ? undefined : summary);
      }
      if (!response.ok) throw new Error(summary?.errorMessage ?? "Could not replay approval request.");

      await refreshApprovals();
      setSuccessMessage(summary?.status === "completed" ? "Approved command replay completed safely in demo mode." : "Replay request processed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown replay failure.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function decideApproval(id: string, decision: ApprovalDecision) {
    setLoadingAction(decision);
    setErrorMessage(null);
    setSuccessMessage(`${decision} request submitted...`);

    try {
      const response = await fetch(`/api/approvals/${id}/${decision}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decidedBy: "local-user", reason: `${decision} from approvals UI` })
      });
      const body = await readJson(response);
      if (!response.ok) {
        const summary = commandSummaryFromEnvelope(body);
        setLatestErrorResult(summary);
        throw new Error(summary?.errorMessage ?? `Could not ${decision} approval request.`);
      }

      await refreshApprovals();
      setSuccessMessage(`Approval request ${id} ${decisionPastTense[decision]}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Unknown ${decision} failure.`);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      <CountCards counts={counts} />

      {showDevCommandControls ? (
        <section className="section">
          <h2>Approval Test Panel</h2>
          <p className="muted">Rendering audit: this workspace is mixed. The page fetches initial data on the server, then this client panel uses the approval and dev command API routes for all interactions.</p>
          <p className="muted">These local commands only exercise permission policy. They do not send email, submit applications, upload files, or use browser automation.</p>
          <div className="card" aria-live="polite">
            <strong>Panel status: {statusLabel(loadingAction)}</strong>
            <p className="muted">Success: {successMessage}</p>
            {errorMessage ? <p role="alert">Error: {errorMessage}</p> : null}
          </div>
          <div className="grid">
            <div className="card">
              <strong>Allowed test</strong>
              <p className="muted">Runs safe `jobs.run_pipeline` demo data.</p>
              <button type="button" disabled={isLoading} onClick={() => void runDevCommand("allowed")}>Run Allowed Test Command</button>
            </div>
            <div className="card">
              <strong>Requires approval test</strong>
              <p className="muted">Posts `email.send` demo data to create a pending approval without sending email.</p>
              <button type="button" disabled={isLoading} onClick={() => void runDevCommand("requires-approval")}>Run Requires Approval Test Command</button>
            </div>
            <div className="card">
              <strong>Denied test</strong>
              <p className="muted">Posts `application.auto_submit` demo data that policy rejects.</p>
              <button type="button" disabled={isLoading} onClick={() => void runDevCommand("denied")}>Run Denied Test Command</button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2>Latest results</h2>
        <div className="grid">
          <LatestCommandResult summary={latestCommandResult} />
          <LatestErrorResult summary={latestErrorResult} />
        </div>
      </section>

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
              <p className="muted">Requested: {formatDate(approval.requestedAt)}</p>
              <p className="muted">Replay: {approval.replayStatus} / attempts {approval.replayAttemptCount}</p>
              {approval.replayedCommandId ? <p className="muted">Replayed command: {approval.replayedCommandId}</p> : null}
              {approval.status === "approved" ? (
                <button type="button" disabled={isLoading || approval.replayStatus === "in_progress"} onClick={() => void replayApproval(approval.id)}>{approval.replayStatus === "completed" ? "Replay Again (Idempotent)" : "Replay Approved Command"}</button>
              ) : null}
              {approval.status === "pending" ? (
                <div className="grid">
                  <button type="button" disabled={isLoading} onClick={() => void decideApproval(approval.id, "approve")}>Approve</button>
                  <button type="button" disabled={isLoading} onClick={() => void decideApproval(approval.id, "reject")}>Reject</button>
                  <button type="button" disabled={isLoading} onClick={() => void decideApproval(approval.id, "cancel")}>Cancel</button>
                </div>
              ) : null}
            </div>
          ))}
          {approvals.length === 0 ? <div className="card">No approval requests yet.</div> : null}
        </div>
      </section>
    </>
  );
}
