import { readFeatureFlags } from "@career-os/config";
import { requirePageUser } from "../_lib/page-auth";

const steps = ["job imported", "job normalized", "remote classified", "clearance segmented", "certification classified", "fit scored", "application difficulty scored", "dashboard segment assigned", "event emitted", "state projection updated"];

export default async function JobPipelineResultsPage() {
  await requirePageUser();

  if (!readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS) {
    return <main className="main"><h1>Job Pipeline Results</h1><div className="card"><strong>Coming later</strong><p className="muted">Pipeline internals are hidden from the public launch surface. Use Jobs for the manual-safe MVP apply loop.</p></div></main>;
  }

  return <main className="main"><h1>Job Pipeline Results</h1><div className="grid">{steps.map((step) => <div className="card" key={step}>{step}</div>)}</div></main>;
}
