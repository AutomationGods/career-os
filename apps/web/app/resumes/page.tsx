import { requirePageUser } from "../_lib/page-auth";
import ResumeDemoPanel from "./resume-demo-panel";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  await requirePageUser();

  return (
    <main className="main">
      <span className="badge">Local review only</span>
      <h1>Resume Factory</h1>
      <p className="muted">Truthfulness-guarded resume drafts for local review.</p>
      <p><a href="/documents">Open Documents workspace</a></p>
      <ResumeDemoPanel />
    </main>
  );
}
