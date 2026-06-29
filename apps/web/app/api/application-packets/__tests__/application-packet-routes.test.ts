import type { CareerCommand, CommandResult } from "@career-os/shared";
import { describe, expect, it } from "vitest";
import {
  applicationPacketCreateSchema,
  applicationPacketListSchema,
  createApplicationPacket,
  generateApplicationPacketPlaceholders,
  getApplicationPacket,
  listApplicationPackets,
  updateApplicationPacketStatus
} from "../_handlers";

function authRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-career-os-test-user-id", "demo-user");
  headers.set("x-career-os-test-user-email", "demo-user@example.com");
  if (init.method && init.method !== "GET") headers.set("origin", "http://localhost");
  return new Request(`http://localhost${path}`, { ...init, headers });
}

describe("application packet route schemas", () => {
  it("accepts create/list payloads", () => {
    expect(applicationPacketCreateSchema.safeParse({ userId: "demo-user", jobId: "job-1" }).success).toBe(true);
    expect(applicationPacketListSchema.safeParse({ userId: "demo-user", limit: "10", status: "awaiting_review" }).success).toBe(true);
  });

  it("rejects invalid create payloads", () => {
    expect(applicationPacketCreateSchema.safeParse({ userId: "demo-user" }).success).toBe(false);
  });
});

describe("application packet API handlers", () => {
  it("routes create/list/get/generate/status through the command bus", async () => {
    const commands: CareerCommand[] = [];
    const bus = {
      async execute(command: CareerCommand): Promise<CommandResult> {
        commands.push(command);
        if (command.type === "application_packets.list") return { ok: true, status: "completed", commandId: command.id, data: { applicationPackets: [] } };
        return {
          ok: true,
          status: "completed",
          commandId: command.id,
          data: {
            id: command.entityId === "job-1" ? "packet-1" : command.entityId,
            userId: command.userId,
            jobId: "job-1",
            selectedJob: { title: "SRE", company: "ExampleCo" },
            selectedCompany: { name: "ExampleCo" },
            fitScoreSummary: { score: 80, segment: "Remote Commercial", highlights: [] },
            notes: [],
            status: command.type === "application_packets.update_status" ? "submitted" : "awaiting_review",
            nextAction: "Review",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
      }
    };

    const createResponse = await createApplicationPacket(authRequest("/api/application-packets", { method: "POST", body: JSON.stringify({ userId: "attacker", jobId: "job-1" }) }), bus);
    await listApplicationPackets(authRequest("/api/application-packets?userId=attacker"), bus);
    await getApplicationPacket("packet-1", authRequest("/api/application-packets/packet-1"), bus);
    await generateApplicationPacketPlaceholders("packet-1", authRequest("/api/application-packets/packet-1/generate-placeholders", { method: "POST", body: JSON.stringify({}) }), bus);
    const statusResponse = await updateApplicationPacketStatus("packet-1", authRequest("/api/application-packets/packet-1/status", { method: "POST", body: JSON.stringify({ status: "submitted" }) }), bus);

    expect(createResponse.status).toBe(201);
    expect(statusResponse.status).toBe(200);
    expect(commands.map((command) => command.type).join("|")).toBe("application_packets.create|application_packets.list|application_packets.get|application_packets.generate_placeholders|application_packets.update_status");
    expect(commands[0]?.entityId).toBe("job-1");
    expect(commands[0]?.userId).toBe("demo-user");
    expect(commands[4]?.entityId).toBe("packet-1");
  });
});
