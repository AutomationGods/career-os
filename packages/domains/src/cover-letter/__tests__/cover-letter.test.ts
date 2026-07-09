import { describe, expect, it } from "vitest";
import { CoverLetterManager } from "../manager";
import { COVER_LETTER_GENERATE_COMMAND, COVER_LETTER_REVISE_COMMAND, COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND } from "../commands";
import { createCommand } from "@career-os/orchestration";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import { snapshotStore } from "@career-os/snapshots";
import { PermissionPolicyService } from "@career-os/orchestration";

function createContext() {
  return { eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService() };
}

describe("CoverLetterManager", () => {
  const manager = new CoverLetterManager();

  it("canHandle returns true for cover letter commands", () => {
    expect(manager.canHandle(createCommand({ type: COVER_LETTER_GENERATE_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: COVER_LETTER_REVISE_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: "unknown", requestedBy: "api" }))).toBe(false);
  });

  it("generates a cover letter with company name", async () => {
    const command = createCommand({
      type: COVER_LETTER_GENERATE_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: { companyName: "Acme Corp", targetRole: "Senior Engineer", tone: "professional" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { reviewRequired: boolean }).reviewRequired).toBe(true);
    expect(result.emittedEvents).toContain("cover_letter.generated");
  });

  it("rejects when company name is missing", async () => {
    const command = createCommand({
      type: COVER_LETTER_GENERATE_COMMAND,
      requestedBy: "api",
      payload: {},
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("COMPANY_NAME_REQUIRED");
  });

  it("creates a placeholder cover letter", async () => {
    const command = createCommand({
      type: COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND,
      requestedBy: "api",
      payload: { companyName: "TestCo" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect((result.data as { isPlaceholder: boolean }).isPlaceholder).toBe(true);
    expect(result.emittedEvents).toContain("cover_letter.placeholder_created");
  });

  it("revises a cover letter by id", async () => {
    const command = createCommand({
      type: COVER_LETTER_REVISE_COMMAND,
      requestedBy: "api",
      payload: { coverLetterId: "cl-1", feedback: "Make it more concise" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect((result.data as { status: string }).status).toBe("revised");
  });
});
