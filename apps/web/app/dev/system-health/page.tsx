import { domainRegistry, runtimeDescriptors } from "@career-os/domains";
import { buildRuntimeAuditReport, createInMemoryOrchestrator, prismaApprovalRequestService } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../api/_lib/auth";
import { getPersistentRuntimeCounts, listPersistentProfileFacts, listPersistentResumeDraftProjections, listPersistentRuntimeProjectionTypes } from "../../api/_lib/persistent-state";

export const dynamic = "force-dynamic";

const auditOrchestrator = createInMemoryOrchestrator();
const commandBackedCommands = new Set(auditOrchestrator.listCommandTypes());

async function getApprovalCounts(userId: string) {
  try {
    const approvals = (await prismaApprovalRequestService.list()).filter((approval) => approval.userId === userId);
    return {
      total: approvals.length,
      pending: approvals.filter((approval) => approval.status === "pending").length,
      approved: approvals.filter((approval) => approval.status === "approved").length,
      rejected: approvals.filter((approval) => approval.status === "rejected").length
    };
  } catch {
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
}

function shortList(values: string[], empty = "None") {
  if (values.length === 0) return empty;
  return values.slice(0, 8).join(", ") + (values.length > 8 ? ` +${values.length - 8} more` : "");
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export default async function SystemHealthPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const [approvalCounts, runtimeCounts, observedStateProjections, profileFacts, resumeDrafts] = await Promise.all([
    getApprovalCounts(authUser.userId),
    getPersistentRuntimeCounts(authUser.userId),
    listPersistentRuntimeProjectionTypes(authUser.userId),
    listPersistentProfileFacts(authUser.userId),
    listPersistentResumeDraftProjections(authUser.userId)
  ]);
  const runtimeAudit = buildRuntimeAuditReport({
    domains: domainRegistry,
    descriptors: runtimeDescriptors,
    runtimeWiredCommands: auditOrchestrator.listCommandTypes(),
    runtimeWiredManagers: auditOrchestrator.listRuntimeManagers(),
    observedStateProjections
  });
  const commandBackedDomains = domainRegistry.filter((domain) => domain.commands.some((command) => commandBackedCommands.has(command)));
  const activeDomains = runtimeAudit.manifests.filter((manifest) => manifest.active);
  const registeredButUnwiredDomains = runtimeAudit.manifests.filter((manifest) => !manifest.runtimeWired && manifest.status !== "placeholder");
  const placeholderDomains = runtimeAudit.manifests.filter((manifest) => manifest.status === "placeholder");
  const disabledOrGatedDomains = runtimeAudit.manifests.filter((manifest) => runtimeAudit.disabledOrGatedDomains.includes(manifest.domainId));
  const factsByTruthStatus = countBy(profileFacts.map((fact) => fact.truthStatus));
  const factsByCategory = countBy(profileFacts.map((fact) => fact.category));
  const factsBlockedFromResume = profileFacts.filter((fact) => fact.blockedUses.includes("resume"));
  const factsAllowedForResume = profileFacts.filter((fact) => fact.allowedUses.includes("resume"));
  const latestResumeDraft = [...resumeDrafts].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.data ?? {};
  const latestTruthfulnessSummary = typeof latestResumeDraft.truthfulnessSummary === "object" && latestResumeDraft.truthfulnessSummary !== null ? latestResumeDraft.truthfulnessSummary as Record<string, unknown> : {};
  const latestUsedFactCount = typeof latestTruthfulnessSummary.usedFactCount === "number" ? latestTruthfulnessSummary.usedFactCount : 0;
  const latestBlockedClaimCount = typeof latestTruthfulnessSummary.blockedClaimCount === "number" ? latestTruthfulnessSummary.blockedClaimCount : 0;
  const latestNeedsEvidenceExclusionCount = typeof latestTruthfulnessSummary.needsEvidenceExclusionCount === "number" ? latestTruthfulnessSummary.needsEvidenceExclusionCount : 0;
  const latestTruthfulnessNotes = Array.isArray(latestTruthfulnessSummary.notes) ? latestTruthfulnessSummary.notes.filter((note): note is string => typeof note === "string") : [];
  const hermesEnabled = process.env.HERMES_AGENT_ENABLED === "true";
  const hermesConfigured = Boolean(process.env.HERMES_AGENT_API_BASE_URL?.trim() && process.env.HERMES_AGENT_API_KEY?.trim());
  const hermesModel = process.env.HERMES_AGENT_MODEL?.trim() || "hermes-agent";

  return (
    <main className="main">
      <span className="badge">System Kernel Manager</span>
      <h1>System Health</h1>
      <p className="muted">Operational view for command routing, approvals, event history, state projections, snapshots, and domain manager coverage.</p>

      <section className="section">
        <h2>Runtime Signals</h2>
        <div className="grid">
          <div className="card"><strong>{runtimeAudit.totalDomains}</strong><p className="muted">registered domain managers</p></div>
          <div className="card"><strong>{runtimeAudit.runtimeWiredCommands}</strong><p className="muted">runtime-wired commands</p></div>
          <div className="card"><strong>{runtimeCounts.events}</strong><p className="muted">events recorded</p></div>
          <div className="card"><strong>{runtimeCounts.stateProjections}</strong><p className="muted">state projections</p></div>
          <div className="card"><strong>{runtimeCounts.snapshots}</strong><p className="muted">snapshots captured</p></div>
          <div className="card"><strong>{approvalCounts.pending}</strong><p className="muted">pending approvals</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Hermes Agent</h2>
        <div className="grid">
          <div className="card">
            <strong>{hermesEnabled ? "Enabled" : "Disabled"}</strong>
            <p className="muted">Hermes server-to-server integration flag</p>
          </div>
          <div className="card">
            <strong>{hermesConfigured ? "Configured" : "Missing config"}</strong>
            <p className="muted">Requires API base URL and server-only bearer key</p>
          </div>
          <div className="card">
            <strong>{hermesModel}</strong>
            <p className="muted">Configured Hermes model name</p>
          </div>
          <a className="card linked-card" href="/api/ai/hermes/health">
            <strong>Health endpoint</strong>
            <p className="muted">Authenticated health and capabilities proxy.</p>
          </a>
        </div>
      </section>

      <section className="section">
        <h2>Manager Coverage</h2>
        <div className="grid">
          <div className="card">
            <strong>{activeDomains.length}</strong>
            <p className="muted">active stateful domains</p>
          </div>
          <div className="card">
            <strong>{commandBackedDomains.length}</strong>
            <p className="muted">command-backed managers</p>
          </div>
          <a className="card linked-card" href="/approvals">
            <strong>Approval Requests</strong>
            <p className="muted">{approvalCounts.total} total · {approvalCounts.approved} approved · {approvalCounts.rejected} rejected</p>
          </a>
          <a className="card linked-card" href="/job-pipeline-results">
            <strong>Job Pipeline Results</strong>
            <p className="muted">Open the data-backed job projection view.</p>
          </a>
        </div>
      </section>

      <section className="section">
        <span className="badge">ProfileFactsManager</span>
        <h2>Profile Facts Truth Source</h2>
        <p className="muted">Read-only truth-source counts for claims available to resumes, packets, cover letters, recruiter communications, interview prep, and career strategy.</p>
        <div className="grid">
          <div className="card"><strong>{profileFacts.length}</strong><p className="muted">total facts</p></div>
          <div className="card"><strong>{factsByTruthStatus.verified ?? 0}</strong><p className="muted">verified facts</p></div>
          <div className="card"><strong>{factsByTruthStatus.user_asserted ?? 0}</strong><p className="muted">user-asserted facts</p></div>
          <div className="card"><strong>{factsByTruthStatus.inferred ?? 0}</strong><p className="muted">inferred facts</p></div>
          <div className="card"><strong>{factsByTruthStatus.needs_evidence ?? 0}</strong><p className="muted">needs-evidence facts</p></div>
          <div className="card"><strong>{factsByTruthStatus.rejected ?? 0}</strong><p className="muted">rejected facts</p></div>
          <div className="card"><strong>{factsByTruthStatus.blocked ?? 0}</strong><p className="muted">blocked facts</p></div>
          <div className="card"><strong>{factsAllowedForResume.length}</strong><p className="muted">allowed for resume usage</p></div>
          <div className="card"><strong>{factsBlockedFromResume.length}</strong><p className="muted">blocked from resume usage</p></div>
          <div className="card"><strong>Categories</strong><p className="muted">{shortList(Object.entries(factsByCategory).map(([category, count]) => `${category}: ${count}`))}</p></div>
        </div>
      </section>

      <section className="section">
        <span className="badge">Resume Factory Manager</span>
        <h2>Resume Factory Profile Facts Consumption</h2>
        <p className="muted">Read-only runtime signal from the latest resume.current_draft projection; no resume editing UI is added here.</p>
        <div className="grid">
          <div className="card"><strong>{latestResumeDraft.generatedFromProfileFacts ? "profile_facts.current" : "No draft yet"}</strong><p className="muted">Profile Facts consumption</p></div>
          <div className="card"><strong>{latestUsedFactCount}</strong><p className="muted">latest used fact count</p></div>
          <div className="card"><strong>{latestBlockedClaimCount}</strong><p className="muted">blocked claim count</p></div>
          <div className="card"><strong>{latestNeedsEvidenceExclusionCount}</strong><p className="muted">needs-evidence exclusion count</p></div>
          <div className="card"><strong>Truthfulness summary</strong><p className="muted">{shortList(latestTruthfulnessNotes, "No truthfulness summary yet")}</p></div>
        </div>
      </section>

      <section className="section">
        <span className="badge">Runtime Audit v2</span>
        <h2>System Honesty Panel</h2>
        <p className="muted">This panel separates runtime-wired domains from registry placeholders. No disabled external actions are enabled by this audit.</p>
        <div className="grid">
          <div className="card"><strong>{activeDomains.length}</strong><p className="muted">active domains</p></div>
          <div className="card"><strong>{registeredButUnwiredDomains.length}</strong><p className="muted">registered but not wired domains</p></div>
          <div className="card"><strong>{placeholderDomains.length}</strong><p className="muted">placeholder domains</p></div>
          <div className="card"><strong>{disabledOrGatedDomains.length}</strong><p className="muted">disabled / gated domains</p></div>
          <div className="card"><strong>{runtimeAudit.runtimeWiredCommands}</strong><p className="muted">runtime-wired commands</p></div>
          <div className="card"><strong>{runtimeAudit.commandsMissingHandlers.length}</strong><p className="muted">commands missing handlers</p></div>
          <div className="card"><strong>{runtimeAudit.toolsActive.length}</strong><p className="muted">tools active</p></div>
          <div className="card"><strong>{runtimeAudit.toolsRegisteredButInactive.length}</strong><p className="muted">registered tools inactive</p></div>
          <div className="card"><strong>{runtimeAudit.manifests.filter((manifest) => manifest.descriptorPresent).length}</strong><p className="muted">descriptors present</p></div>
          <div className="card"><strong>{runtimeAudit.domainsClaimingStatefulWithoutProjection.length}</strong><p className="muted">state projections not written</p></div>
          <div className="card"><strong>{runtimeAudit.missingDeclaredTests.length}</strong><p className="muted">declared tests missing files</p></div>
        </div>
        <div className="grid">
          <div className="card"><strong>Active domains</strong><p className="muted">{shortList(activeDomains.map((domain) => domain.displayName))}</p></div>
          <div className="card"><strong>Needs wiring</strong><p className="muted">{shortList(registeredButUnwiredDomains.map((domain) => domain.displayName))}</p></div>
          <div className="card"><strong>Placeholders</strong><p className="muted">{shortList(placeholderDomains.map((domain) => domain.displayName))}</p></div>
          <div className="card"><strong>Disabled / gated</strong><p className="muted">{shortList(disabledOrGatedDomains.map((domain) => domain.displayName))}</p></div>
          <div className="card"><strong>Runtime-wired commands</strong><p className="muted">{shortList(auditOrchestrator.listCommandTypes())}</p></div>
          <div className="card"><strong>Commands missing handlers</strong><p className="muted">{shortList(runtimeAudit.commandsMissingHandlers)}</p></div>
          <div className="card"><strong>Tools active</strong><p className="muted">{shortList(runtimeAudit.toolsActive)}</p></div>
          <div className="card"><strong>Tools registered but inactive</strong><p className="muted">{shortList(runtimeAudit.toolsRegisteredButInactive)}</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Domain Manager Readiness</h2>
        <div className="grid">
          {runtimeAudit.manifests.map((manifest) => (
            <div className="card" key={manifest.domainId}>
              <strong>{manifest.displayName}</strong>
              <p className="muted">Manager: {manifest.owningManager}</p>
              <p className="muted">Descriptor: {manifest.descriptorPresent ? "present" : "missing"}</p>
              <p className="muted">Commands: {manifest.commandsRuntimeWired.length}/{manifest.commandsDeclared.length} wired · Registry: {manifest.commands.length}</p>
              <p className="muted">Events: {manifest.eventsProduced.length} · Projections: {manifest.stateProjectionsWritten.length}/{manifest.stateProjections.length} written</p>
              <p className="muted">Tests: declared {Object.values(manifest.testsDeclared).filter(Boolean).length} · found {Object.values(manifest.testsFound).filter(Boolean).length}</p>
              <p className="muted">Blocked: {shortList(manifest.blockedFromActiveReasons, "None")}</p>
              <span className="badge">{manifest.status}</span> <span className="badge">{manifest.readinessLabel}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
