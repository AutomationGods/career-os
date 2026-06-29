import { readFeatureFlags } from "@career-os/config";
import { requirePageUser } from "../../_lib/page-auth";

export default async function RelationshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();

  if (!readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS) {
    return <main className="main"><h1>Relationship Detail</h1><div className="card"><strong>Coming later</strong><p className="muted">Relationship detail pages are hidden from the public launch surface. Continue the launch flow from Application Packets.</p></div></main>;
  }

  return <main className="main"><h1>Relationship Detail</h1><div className="card"><strong>{(await params).id}</strong><p className="muted">Role history, relevance, responsiveness, trust, last contact, and next follow-up placeholders.</p></div></main>;
}
