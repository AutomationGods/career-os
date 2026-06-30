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
  const [statusMessage, setStatusMessage] = useState(existingPacketHref ? "Application packet already exists for this job." : "Ready to create an application packet.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function createPacket() {
    setIsCreating(true);
    setErrorMessage(null);
    setStatusMessage("Creating application packet...");

    try {
      const response = await fetch("/api/application-packets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          selectedCompany,
          selectedJob,
          fitScoreSummary,
          notes: ["Created from Job Pipeline Results."]
        })
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(errorMessageFromEnvelope(body) ?? "Could not create application packet.");
      }

      const packetId = packetIdFromEnvelope(body);
      if (!packetId) throw new Error("Application packet was created but no packet id was returned.");

      setStatusMessage("Application packet created. Opening packet detail...");
      router.push(`/application-packets/${packetId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown packet creation failure.");
      setStatusMessage("Packet creation stopped.");
    } finally {
      setIsCreating(false);
    }
  }

  if (existingPacketHref) {
    return (
      <div className="packet-flow-actions">
        <a className="packet-action-link" href={existingPacketHref}>Open application packet</a>
        <p className="muted" aria-live="polite">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="packet-flow-actions">
      <button type="button" onClick={createPacket} disabled={isCreating}>
        {isCreating ? "Creating packet..." : "Start application packet"}
      </button>
      <p className="muted" aria-live="polite">{statusMessage}</p>
      {errorMessage ? <p role="alert">Error: {errorMessage}</p> : null}
    </div>
  );
}
