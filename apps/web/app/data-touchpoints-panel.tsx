"use client";

import { useEffect, useState } from "react";

interface TouchpointCounts {
  events: number;
  stateProjections: number;
  snapshots: number;
  applicationPackets: number;
  relationships: number;
}

interface EventSummary {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  domain: string;
  createdAt: string;
}

interface ProjectionSummary {
  id: string;
  projectionType: string;
  entityType: string;
  entityId: string;
  updatedAt: string;
}

interface SnapshotSummary {
  id: string;
  snapshotType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

interface DataTouchpointsView {
  mode: string;
  generatedAt: string;
  counts: TouchpointCounts;
  recentEvents: EventSummary[];
  stateProjections: ProjectionSummary[];
  snapshots: SnapshotSummary[];
}

interface CommandStepSummary {
  name: string;
  commandType: string;
  ok: boolean;
  status: string;
  errorMessage?: string;
}

interface TouchpointsEnvelope {
  ok: boolean;
  data?: DataTouchpointsView;
  error?: { message: string };
}

interface SeedEnvelope {
  ok: boolean;
  data?: { steps: CommandStepSummary[]; touchpoints: DataTouchpointsView };
  error?: { message: string };
}

const countLabels: Array<[keyof TouchpointCounts, string]> = [
  ["events", "Events"],
  ["stateProjections", "State projections"],
  ["snapshots", "Snapshots"],
  ["applicationPackets", "Packets"],
  ["relationships", "Relationships"]
];

async function readJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function displayName(value: string) {
  const cleaned = value.replace(/placeholder/gi, "draft").replace(/[._-]+/g, " ").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : value;
}

function EmptyState() {
  return <p className="muted">No local data touchpoints yet. Seed the demo to create a job pipeline, packet, relationship, resume draft, events, state, and snapshots.</p>;
}

export default function DataTouchpointsPanel() {
  const [data, setData] = useState<DataTouchpointsView | undefined>(undefined);
  const [steps, setSteps] = useState<CommandStepSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Loading local data touchpoints...");

  async function refreshTouchpoints() {
    try {
      const response = await fetch("/api/demo/touchpoints", { cache: "no-store" });
      const body = await readJson<TouchpointsEnvelope>(response);
      if (!response.ok || !body?.ok || !body.data) {
        setMessage(body?.error?.message ?? "Unable to load data touchpoints.");
        return;
      }
      setData(body.data);
      setMessage("Local data touchpoints loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load data touchpoints.");
    }
  }

  async function seedTouchpoints() {
    setIsLoading(true);
    setMessage("Running local commands through the in-memory data touchpoints...");
    try {
      const response = await fetch("/api/demo/touchpoints", { method: "POST" });
      const body = await readJson<SeedEnvelope>(response);
      if (!response.ok || !body?.ok || !body.data) {
        setMessage(body?.error?.message ?? "Unable to seed local data touchpoints.");
      } else {
        setSteps(body.data.steps);
        setData(body.data.touchpoints);
        setMessage("Seeded job pipeline, packet, relationship, resume draft, events, state, and snapshots.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to seed local data touchpoints.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshTouchpoints();
  }, []);

  return (
    <section id="data-touchpoints" className="section">
      <span className="badge">Local data touchpoints</span>
      <h2>Working Data Flow</h2>
      <p className="muted">Runs safe local commands and shows the records they create across events, state projections, snapshots, packets, and relationships.</p>
      <button type="button" disabled={isLoading} onClick={() => void seedTouchpoints()}>
        {isLoading ? "Seeding Data..." : "Seed Demo Data Touchpoints"}
      </button>
      <p className="muted" aria-live="polite">{message}</p>

      {data ? (
        <>
          <div className="grid">
            {countLabels.map(([key, label]) => (
              <div className="card" key={key}>
                <strong>{data.counts[key]}</strong>
                <br />
                <span className="muted">{label}</span>
              </div>
            ))}
          </div>

          {steps.length > 0 ? (
            <div className="card data-card">
              <strong>Last seed run</strong>
              <ul className="compact-list">
                {steps.map((step) => (
                  <li key={`${step.commandType}-${step.name}`}>
                    {step.ok ? "✅" : "⚠️"} {step.name}: {step.status}{step.errorMessage ? ` — ${step.errorMessage}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid touchpoint-grid">
            <div className="card data-card touchpoint-card">
              <strong>Recent events</strong>
              {data.recentEvents.length > 0 ? (
                <ul className="compact-list touchpoint-list">
                  {data.recentEvents.slice(0, 5).map((event) => <li className="touchpoint-item" key={event.id}>{displayName(event.eventType)} · {displayName(event.entityType)}:{event.entityId}</li>)}
                </ul>
              ) : <EmptyState />}
            </div>
            <div className="card data-card touchpoint-card">
              <strong>State projections</strong>
              {data.stateProjections.length > 0 ? (
                <ul className="compact-list touchpoint-list">
                  {data.stateProjections.slice(0, 5).map((projection) => <li className="touchpoint-item" key={projection.id}>{displayName(projection.projectionType)} · {displayName(projection.entityType)}:{projection.entityId}</li>)}
                </ul>
              ) : <EmptyState />}
            </div>
            <div className="card data-card touchpoint-card">
              <strong>Snapshots</strong>
              {data.snapshots.length > 0 ? (
                <ul className="compact-list touchpoint-list">
                  {data.snapshots.slice(0, 5).map((snapshot) => <li className="touchpoint-item" key={snapshot.id}>{displayName(snapshot.snapshotType)} · {displayName(snapshot.entityType)}:{snapshot.entityId}</li>)}
                </ul>
              ) : <EmptyState />}
            </div>
          </div>
        </>
      ) : <EmptyState />}
    </section>
  );
}
