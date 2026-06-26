import { describe, expect, it } from "vitest";
import { CommandBus, createCommand } from "../command-bus";

describe("CommandBus", () => {
  it("registers and executes a known command", async () => {
    const bus = new CommandBus();
    bus.registerHandler("test.command", (command) => ({ ok: true, status: "completed", commandId: command.id, data: { handled: true } }));
    const result = await bus.execute(createCommand({ type: "test.command", requestedBy: "system", payload: {} }));

    expect(bus.canHandle("test.command")).toBe(true);
    expect(bus.listHandlers().includes("test.command")).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown command", async () => {
    const bus = new CommandBus();
    const result = await bus.execute(createCommand({ type: "missing.command", requestedBy: "system", payload: {} }));

    expect(result.ok).toBe(false);
    expect(result.status).toBe("rejected");
  });

  it("returns failed result when a handler throws", async () => {
    const bus = new CommandBus();
    bus.registerHandler("test.throw", () => {
      throw new Error("boom");
    });
    const result = await bus.execute(createCommand({ type: "test.throw", requestedBy: "system", payload: {} }));

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error?.code).toBe("COMMAND_HANDLER_FAILED");
  });
});
