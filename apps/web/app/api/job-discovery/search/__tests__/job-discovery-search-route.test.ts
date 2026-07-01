import { DEFAULT_JOB_DISCOVERY_QUERY } from "@career-os/domains";
import { describe, expect, it } from "vitest";
import { POST } from "../route";

process.env.CAREER_OS_AUTH_DISABLED = "true";
process.env.CAREER_OS_AUTH_DISABLED_USER_ID = "user-1";
process.env.CAREER_OS_COMMAND_RUNTIME = "local-memory";

describe("job discovery search route", () => {
  it("defaults blank queries and clamps high limits before command execution", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(input.toString());
      return new Response(JSON.stringify({
        "job-count": 1,
        jobs: [
          {
            id: 123,
            url: "https://remotive.com/remote-jobs/devops/splunk-engineer-123",
            title: "Splunk Terraform Engineer",
            company_name: "ExampleCo",
            job_type: "full_time",
            candidate_required_location: "Remote",
            description: "<p>Splunk Cribl Terraform AWS observability role.</p>"
          }
        ]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    try {
      const response = await POST(new Request("http://localhost/api/job-discovery/search", {
        method: "POST",
        body: JSON.stringify({ query: "   ", limit: 500 })
      }));
      const body = await response.json();
      const remotiveUrl = requestedUrls.find((url) => url.includes("remotive.com"));
      const url = new URL(remotiveUrl ?? "http://localhost");

      expect(response.status).toBe(201);
      expect(body.ok).toBe(true);
      expect(body.data.result.imported).toBe(1);
      expect(body.data.result.source).toBe("all");
      expect(url.searchParams.get("search")).toBe(DEFAULT_JOB_DISCOVERY_QUERY);
      expect(url.searchParams.get("limit")).toBe("50");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses the selected source and applies keyword filtering", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(input.toString());
      return new Response(JSON.stringify([
        { last_updated: 1, legal: "Remote OK attribution required" },
        { id: 999, position: "Terraform Engineer", company: "RemoteCo", url: "https://remoteok.com/remote-jobs/999", description: "Terraform AWS role" },
        { id: 1000, position: "Ruby Engineer", company: "RemoteCo", url: "https://remoteok.com/remote-jobs/1000", description: "Rails role" }
      ]), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    try {
      const response = await POST(new Request("http://localhost/api/job-discovery/search", {
        method: "POST",
        body: JSON.stringify({ query: "terraform", limit: 10, source: "remoteok" })
      }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.ok).toBe(true);
      expect(body.data.result.source).toBe("remoteok");
      expect(body.data.result.imported).toBe(1);
      expect(body.data.result.jobs[0].jobId).toBe("remoteok:999");
      expect(requestedUrls.length).toBe(1);
      expect(requestedUrls[0]?.includes("remoteok.com")).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects unsupported sources", async () => {
    const response = await POST(new Request("http://localhost/api/job-discovery/search", {
      method: "POST",
      body: JSON.stringify({ query: "splunk", limit: 5, source: "other" })
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_JOB_DISCOVERY_REQUEST");
  });
});
