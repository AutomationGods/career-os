"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SelectedJobPayload {
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  employmentType?: string;
  source: string;
}

interface FitScoreSummaryPayload {
  score: number;
  segment: string;
  highlights: string[];
}

interface ApplicationPacketActionProps {
  existingPacketHref?: string;
  fitScoreSummary: FitScoreSummaryPayload;
  jobId: string;
  selectedCompany: { name: string };
  selectedJob: SelectedJobPayload;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function packetIdFromEnvelope(body: unknown) {
  if (!isRecord(body) || !isRecord(body.data) || !isRecord(body.data.result)) return undefined;
  return typeof body.data.result.id === "string" ? body.data.result.id : undefined;
}

function errorMessageFromEnvelope(body: unknown) {
  if (!isRecord(body) || !isRecord(body.error)) return undefined;
  return typeof body.error.message === "string" ? body.error.message : undefined;
}

export default function ApplicationPacketAction({ existingPacketHref, fitScoreSummary, jobId, selectedCompany, selectedJob }: ApplicationPacketActionProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(existingPacketHref ? "Application draft already exists for this job." : "Ready to create an application draft.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function createPacket() {
    setIsCreating(true);
    setErrorMessage(null);
    setStatusMessage("Creating application draft...");

    try {
      const response = await fetch("/api/application-packets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          selectedCompany,
          selectedJob,
          fitScoreSummary,
          notes: ["Created from Job Matches."]
        })
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(errorMessageFromEnvelope(body) ?? "Could not create application draft.");
      }

      const packetId = packetIdFromEnvelope(body);
      if (!packetId) throw new Error("Application draft was created but no id was returned.");

      setStatusMessage("Application draft created. Opening application detail...");
      router.push(`/application-packets/${packetId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown application draft creation failure.");
      setStatusMessage("Application draft creation stopped.");
    } finally {
      setIsCreating(false);
    }
  }

  if (existingPacketHref) {
    return (
      <div className="packet-flow-actions">
        <a className="packet-action-link" href={existingPacketHref}>Open application draft</a>
        <p className="muted" aria-live="polite">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="packet-flow-actions">
      <button type="button" onClick={createPacket} disabled={isCreating}>
        {isCreating ? "Creating draft..." : "Create application draft"}
      </button>
      <p className="muted" aria-live="polite">{statusMessage}</p>
      {errorMessage ? <p role="alert">Error: {errorMessage}</p> : null}
    </div>
  );
}
