import { listApplicationPackets, listRelationshipPeople } from "@career-os/domains";
import { eventStore } from "@career-os/events";
import { createCommand } from "@career-os/orchestration";
import { snapshotStore } from "@career-os/snapshots";
import type { CommandResult } from "@career-os/shared";
import { stateStore } from "@career-os/state";
import { createLocalReviewCommandBus } from "../api/_lib/command-runtime";

const demoUserId = "user-demo-local";
const demoJobId = "job-demo-splunk-cribl";
const demoCompanyId = "company-demo-commercial";
const demoPersonId = "person-demo-recruiter";

const demoJob = {
  id: demoJobId,
  title: "Splunk / Cribl Platform Engineer",
  company: "Demo Commercial Company",
  location: "Remote",
  description:
    "Remote Splunk and Cribl platform role focused on SIEM, log onboarding, Linux, Terraform, AWS, Azure, GCP, observability, and security data pipelines. CISSP and Security+ preferred but not required. No clearance required.",
  source: "local-demo",
  employmentType: "full-time",
  requiredFields: ["resume", "work authorization", "location preference"],
  hasEasyApply: false
};

const verifiedFacts = [
  "Built Splunk SIEM dashboards and saved searches for security monitoring.",
  "Implemented Cribl pipelines for routing, filtering, and normalizing observability data.",
  "Performed log onboarding for Linux, AWS, Azure, and GCP sources into security data pipelines.",
  "Managed Terraform modules for cloud observability infrastructure."
];

const targetKeywords = ["Splunk", "Cribl", "SIEM", "log onboarding", "observability", "Linux", "Terraform", "AWS", "Azure", "GCP", "security data pipelines", "CISSP", "Security+", "clearance"];

type UnknownRecord = Record<string, unknown>;

interface CommandStepSummary {
  name: string;
  commandType: string;
  ok: boolean;
  status: string;
  commandId: string;
  errorCode?: string;
  errorMessage?: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function commandData(result: CommandResult): UnknownRecord | undefined {
  return isRecord(result.data) ? result.data : undefined;
}

function summarizeStep(name: string, commandType: string, result: CommandResult): CommandStepSummary {
  return {
    name,
    commandType,
    ok: result.ok,
    status: result.status,
    commandId: result.commandId,
    errorCode: result.error?.code,
    errorMessage: result.error?.message
  };
}

function summarizeEvent(event: { id: string; eventType: string; entityType: string; entityId: string; domain: string; createdAt: Date; userId?: string }) {
  return {
    id: event.id,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
    domain: event.domain,
    userId: event.userId,
    createdAt: event.createdAt.toISOString()
  };
}

function summarizeProjection(projection: { id: string; projectionType: string; entityType: string; entityId: string; updatedAt: Date; data: unknown; userId?: string }) {
  return {
    id: projection.id,
    projectionType: projection.projectionType,
    entityType: projection.entityType,
    entityId: projection.entityId,
    userId: projection.userId,
    updatedAt: projection.updatedAt.toISOString(),
    data: projection.data
  };
}

function summarizeSnapshot(snapshot: { id: string; snapshotType: string; entityType: string; entityId: string; checksum: string; createdAt: Date; userId?: string }) {
  return {
    id: snapshot.id,
    snapshotType: snapshot.snapshotType,
    entityType: snapshot.entityType,
    entityId: snapshot.entityId,
    userId: snapshot.userId,
    checksum: snapshot.checksum,
    createdAt: snapshot.createdAt.toISOString()
  };
}

export async function getLocalDataTouchpoints(limit = 20) {
  const allEvents = eventStore.list();
  const allState = stateStore.list();
  const allSnapshots = snapshotStore.list();
  const [recentEvents, recentState, recentSnapshots] = await Promise.all([
    Promise.resolve(eventStore.listRecent(limit)),
    Promise.resolve(stateStore.listRecent(limit)),
    Promise.resolve(snapshotStore.listRecent(limit))
  ]);
  const applicationPackets = listApplicationPackets();
  const relationships = listRelationshipPeople();

  return {
    mode: "local-memory",
    generatedAt: new Date().toISOString(),
    counts: {
      events: allEvents.length,
      stateProjections: allState.length,
      snapshots: allSnapshots.length,
      applicationPackets: applicationPackets.length,
      relationships: relationships.length
    },
    recentEvents: recentEvents.map(summarizeEvent),
    stateProjections: recentState.map(summarizeProjection),
    snapshots: recentSnapshots.map(summarizeSnapshot),
    applicationPackets,
    relationships
  };
}

export async function seedLocalDataTouchpoints() {
  const bus = createLocalReviewCommandBus();
  const steps: CommandStepSummary[] = [];

  async function run(name: string, command: ReturnType<typeof createCommand>) {
    const result = await bus.execute(command);
    steps.push(summarizeStep(name, command.type, result));
    return result;
  }

  const jobResult = await run(
    "Run job intelligence pipeline",
    createCommand({
      type: "jobs.run_pipeline",
      requestedBy: "api",
      userId: demoUserId,
      entityType: "job",
      entityId: demoJobId,
      payload: demoJob
    })
  );

  const pipelineResult = commandData(jobResult);
  const selectedJob = isRecord(pipelineResult?.normalizedJob) ? pipelineResult.normalizedJob : demoJob;
  const dashboardSegment = typeof pipelineResult?.dashboardSegment === "string" ? pipelineResult.dashboardSegment : "Remote Commercial";
  const fitScore = typeof pipelineResult?.fitScore === "number" ? pipelineResult.fitScore : 0;

  const packetResult = await run(
    "Create application packet",
    createCommand({
      type: "application_packets.create",
      requestedBy: "api",
      userId: demoUserId,
      entityType: "job",
      entityId: demoJobId,
      payload: {
        jobId: demoJobId,
        companyId: demoCompanyId,
        personId: demoPersonId,
        selectedJob,
        selectedCompany: { id: demoCompanyId, name: demoJob.company },
        selectedPerson: { id: demoPersonId, name: "Taylor Recruiter", email: "taylor.recruiter@example.invalid" },
        fitScoreSummary: {
          score: fitScore,
          segment: dashboardSegment,
          highlights: ["Remote commercial role", "Splunk/Cribl keyword match", "No clearance claim generated"]
        },
        notes: ["Seeded through local data touchpoints demo."]
      }
    })
  );

  const packet = commandData(packetResult);
  const packetId = typeof packet?.id === "string" ? packet.id : undefined;

  await run(
    "Dedupe relationship contact",
    createCommand({
      type: "relationships.dedupe",
      requestedBy: "api",
      userId: demoUserId,
      entityType: "person",
      entityId: demoPersonId,
      payload: {
        people: [
          {
            name: "Taylor Recruiter",
            company: demoJob.company,
            emails: ["taylor.recruiter@example.invalid"],
            roles: ["recruiter"],
            nextFollowupAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            name: "Taylor Recruiter",
            company: demoJob.company,
            emails: ["TAYLOR.RECRUITER@example.invalid"],
            roles: ["recruiter"]
          }
        ]
      }
    })
  );

  if (packetId) {
    await run(
      "Generate packet drafts",
      createCommand({
        type: "application_packets.generate_placeholders",
        requestedBy: "api",
        userId: demoUserId,
        entityType: "application_packet",
        entityId: packetId,
        payload: { id: packetId }
      })
    );

    await run(
      "Generate truth-guarded resume draft",
      createCommand({
        type: "resume.generate",
        requestedBy: "api",
        userId: demoUserId,
        entityType: "application_packet",
        entityId: packetId,
        payload: {
          jobId: demoJobId,
          companyId: demoCompanyId,
          applicationPacketId: packetId,
          resumeVersionId: `resume-version-${packetId}`,
          targetRole: demoJob.title,
          companyName: demoJob.company,
          jobDescription: demoJob.description,
          verifiedFacts,
          targetKeywords
        }
      })
    );
  }

  return {
    runId: `touchpoints_${Date.now()}`,
    seededAt: new Date().toISOString(),
    steps,
    touchpoints: await getLocalDataTouchpoints()
  };
}
