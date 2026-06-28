import { CommandBus } from "@career-os/orchestration";
import { describe, expect, it } from "vitest";
import { getJob, importManualJob, listJobs, runJobPipeline } from "../_handlers";

function busFor(handler: (command: { type: string; payload: unknown; entityId?: string }) => unknown) {
  const bus = new CommandBus();
  for (const type of ["jobs.import_manual_url", "jobs.list", "jobs.get", "jobs.run_pipeline"]) {
    bus.registerHandler(type, (command) => ({ ok: true, status: "completed", commandId: command.id, data: handler(command) }));
  }
  return bus;
}

describe("job API handlers", () => {
  it("routes manual imports to jobs.import_manual_url", async () => {
    let seenType = "";
    const bus = busFor((command) => {
      seenType = command.type;
      return { job: { id: "job-1", title: "SRE", sources: [], segments: [], fitScores: [], difficultyScores: [] }, externalActionTaken: false };
    });
    const response = await importManualJob(new Request("http://localhost/api/jobs/import", {
      method: "POST",
      body: JSON.stringify({ title: "SRE", companyName: "ExampleCo", description: "Splunk Cribl role" })
    }), bus);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(seenType).toBe("jobs.import_manual_url");
  });

  it("rejects invalid import payloads", async () => {
    const response = await importManualJob(new Request("http://localhost/api/jobs/import", { method: "POST", body: JSON.stringify({ title: "SRE" }) }), busFor(() => ({})));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_JOB_IMPORT");
  });

  it("routes list/get/run-pipeline to job commands", async () => {
    const seen: string[] = [];
    let runPayload: Record<string, unknown> = {};
    const bus = busFor((command) => {
      seen.push(command.type);
      if (command.type === "jobs.list") return { jobs: [] };
      if (command.type === "jobs.get") return { job: { id: command.entityId, title: "SRE" } };
      runPayload = command.payload as Record<string, unknown>;
      return { jobId: command.entityId, dashboardSegment: "Remote Commercial" };
    });

    await listJobs(new Request("http://localhost/api/jobs?userId=demo-user&segment=Remote%20Commercial"), bus);
    await getJob("job-1", bus);
    await runJobPipeline("job-1", new Request("http://localhost/api/jobs/job-1/run-pipeline", { method: "POST", body: JSON.stringify({}) }), bus);

    expect(seen.join("|")).toBe("jobs.list|jobs.get|jobs.run_pipeline");
    expect(runPayload.id).toBe("job-1");
    expect(runPayload.title).toBe(undefined);
    expect(runPayload.description).toBe(undefined);
  });
});
