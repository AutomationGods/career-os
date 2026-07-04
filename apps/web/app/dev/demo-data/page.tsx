import DataTouchpointsPanel from "../../data-touchpoints-panel";

export const dynamic = "force-dynamic";

export default function DemoDataPage() {
  const localDemoRoutesEnabled = process.env.CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES === "true";

  return (
    <main className="main">
      <span className="badge">Developer tool</span>
      <h1>Demo Data</h1>
      <p className="muted">Seed and inspect local event/state/snapshot data for development only.</p>
      <DataTouchpointsPanel enabled={localDemoRoutesEnabled} />
    </main>
  );
}
