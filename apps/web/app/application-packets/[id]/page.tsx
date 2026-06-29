import { requirePageUser } from "../../_lib/page-auth";
import PacketDetailPanel from "./packet-detail-panel";

export default async function PacketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();

  return (
    <main className="main">
      <span className="badge">Manual packet workspace</span>
      <h1>Packet Detail</h1>
      <p className="muted">Review drafts, generate a verified-facts resume, export locally, and track manual-only application status.</p>
      <PacketDetailPanel packetId={(await params).id} />
    </main>
  );
}
