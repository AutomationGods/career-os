"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type PacketStatus = "not_started" | "ready_to_generate" | "generated" | "awaiting_review" | "ready_to_apply" | "submitted" | "followup_due" | "closed";

const nextStatuses: Record<PacketStatus, { status: PacketStatus; label: string; note: string }[]> = {
  not_started: [{ status: "closed", label: "Close packet", note: "Closed manually before packet generation." }],
  ready_to_generate: [
    { status: "awaiting_review", label: "Mark awaiting review", note: "Packet moved to manual review." },
    { status: "closed", label: "Close packet", note: "Closed manually before applying." }
  ],
  generated: [
    { status: "awaiting_review", label: "Mark awaiting review", note: "Generated materials moved to manual review." },
    { status: "closed", label: "Close packet", note: "Closed manually before applying." }
  ],
  awaiting_review: [
    { status: "ready_to_apply", label: "Mark ready to apply manually", note: "Human review complete; ready for manual application outside Career OS." },
    { status: "closed", label: "Close packet", note: "Closed manually after review." }
  ],
  ready_to_apply: [
    { status: "followup_due", label: "Mark follow-up due", note: "Manual application workflow moved to follow-up tracking." },
    { status: "closed", label: "Close packet", note: "Closed manually before submission tracking." }
  ],
  submitted: [{ status: "followup_due", label: "Mark follow-up due", note: "Manual submission is ready for follow-up." }],
  followup_due: [{ status: "closed", label: "Close packet", note: "Closed after follow-up review." }],
  closed: []
};

export default function PacketStatusAction({ packetId, status }: { packetId: string; status: PacketStatus }) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<PacketStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const actions = useMemo(() => nextStatuses[status] ?? [], [status]);

  async function updateStatus(nextStatus: PacketStatus, note: string) {
    setPendingStatus(nextStatus);
    setMessage(null);
    const response = await fetch(`/api/application-packets/${packetId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, note })
    });
    const body = await response.json().catch(() => ({}));
    setPendingStatus(null);
    if (!response.ok || body.ok === false) {
      setMessage(body.error?.message ?? "Unable to update packet status.");
      return;
    }
    setMessage("Packet status updated.");
    router.refresh();
  }

  return (
    <div className="card">
      <strong>Manual packet status</strong>
      <p className="muted">Current status: {status}</p>
      {actions.length > 0 ? (
        <div className="action-row">
          {actions.map((action) => (
            <button key={action.status} type="button" onClick={() => updateStatus(action.status, action.note)} disabled={pendingStatus !== null}>
              {pendingStatus === action.status ? "Updating…" : action.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">This packet is closed.</p>
      )}
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
