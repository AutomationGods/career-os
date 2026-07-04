import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import type { CareerCommand } from "@career-os/shared";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { CAREER_OPPORTUNITIES_FIND_JOBS_COMMAND, CareerOpportunitiesManager, type FindJobsPayload } from "../manager";

function createContext() {
  return {
    eventStore: new InMemoryEventStore(),
    stateStore: new InMemoryStateStore(),
    snapshotStore: new InMemorySnapshotStore()
  };
}

function createFindJobsCommand(payload: FindJobsPayload = { limit: 5, source: "remotive" }): CareerCommand<FindJobsPayload> {
  return {
    id: "command-certification-backed-search",
    type: CAREER_OPPORTUNITIES_FIND_JOBS_COMMAND,
    requestedBy: "api",
    userId: "certification-search-user",
    entityType: "career_opportunities",
    entityId: "certification-search-user",
    payload,
    createdAt: new Date().toISOString()
  };
}

describe("CareerOpportunitiesManager certification-backed discovery", () => {
  it("uses certifications from the Career Profile as public job search query terms", async () => {
    const context = createContext();
    const capturedUrls: string[] = [];
    const manager = new CareerOpportunitiesManager({
      fetcher: async (input) => {
        capturedUrls.push(String(input));
        return new Response(JSON.stringify({
          "job-count": 1,
          jobs: [
            {
              id: 42,
              url: "https://remotive.com/remote-jobs/devops/splunk-certified-architect-42",
              title: "Splunk Enterprise Certified Architect Consultant",
              company_name: "Example Security",
              job_type: "contract",
              candidate_required_location: "Remote",
              description: "Splunk Enterprise Certified Architect and Administrator needed for SIEM onboarding."
            }
          ]
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    });

    await context.stateStore.upsertProjection({
      userId: "certification-search-user",
      projectionType: "career_profile.current",
      entityType: "career_profile",
      entityId: "certification-search-user",
      data: {
        targetTitles: [],
        fastestRoleTargets: [],
        suggestedJobSearchKeywords: [
          "Splunk Enterprise Certified Architect",
          "Splunk Enterprise Certified Administrator",
          "splunk enterprise",
          "splunk"
        ],
        strongestSkills: ["Splunk"],
        strongestTools: ["SPL"],
        searchDiagnostics: {
          certificationsUsedAsSearchKeywords: [
            "Splunk Enterprise Certified Architect",
            "Splunk Enterprise Certified Administrator"
          ]
        }
      }
    });

    const result = await manager.handle(createFindJobsCommand(), context);
    const pipeline = result.data as {
      sourceQuery: string;
      searchQueriesUsed: string[];
      certificationsUsedAsSearchKeywords: string[];
      opportunities: { title: string }[];
    } | undefined;
    const searchParam = new URL(capturedUrls[0]).searchParams.get("search") ?? "";

    expect(result.ok).toBe(true);
    expect(pipeline?.sourceQuery.includes("Splunk Enterprise Certified Architect")).toBe(true);
    expect(pipeline?.sourceQuery.includes("Splunk Enterprise Certified Administrator")).toBe(true);
    expect(Boolean(pipeline?.searchQueriesUsed.includes("Splunk Enterprise Certified Architect"))).toBe(true);
    expect(Boolean(pipeline?.searchQueriesUsed.includes("Splunk Enterprise Certified Administrator"))).toBe(true);
    expect(JSON.stringify(pipeline?.certificationsUsedAsSearchKeywords)).toBe(JSON.stringify([
      "Splunk Enterprise Certified Architect",
      "Splunk Enterprise Certified Administrator"
    ]));
    expect(searchParam.includes("Splunk Enterprise Certified Architect")).toBe(true);
    expect(searchParam.includes("Splunk Enterprise Certified Administrator")).toBe(true);
    expect(pipeline?.opportunities[0]?.title).toBe("Splunk Enterprise Certified Architect Consultant");
  });
});
