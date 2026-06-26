import type { CareerCommand, CommandResult } from "@career-os/shared";

export interface CommandHandler<TPayload = unknown, TData = unknown> {
  (command: CareerCommand<TPayload>): Promise<CommandResult<TData>> | CommandResult<TData>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createCommand<TPayload>(input: Omit<CareerCommand<TPayload>, "id" | "createdAt" | "payload"> & { id?: string; createdAt?: string; payload?: TPayload }): CareerCommand<TPayload> {
  return {
    ...input,
    id: input.id ?? `command_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    payload: (input.payload ?? {}) as TPayload,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler>();

  registerHandler(commandType: string, handler: CommandHandler) {
    this.handlers.set(commandType, handler);
  }

  canHandle(commandType: string) {
    return this.handlers.has(commandType);
  }

  listHandlers() {
    return [...this.handlers.keys()].sort();
  }

  async execute(command: CareerCommand): Promise<CommandResult> {
    const validation = this.validateCommand(command);
    if (!validation.ok) return validation;

    const handler = this.handlers.get(command.type);
    if (!handler) {
      return {
        ok: false,
        status: "rejected",
        commandId: command.id,
        error: { code: "COMMAND_HANDLER_NOT_FOUND", message: `No handler registered for ${command.type}` }
      };
    }

    try {
      return await handler(command);
    } catch (error) {
      return {
        ok: false,
        status: "failed",
        commandId: command.id,
        error: {
          code: "COMMAND_HANDLER_FAILED",
          message: error instanceof Error ? error.message : "Unknown command handler failure"
        }
      };
    }
  }

  private validateCommand(command: CareerCommand): CommandResult {
    if (!isRecord(command)) {
      return { ok: false, status: "rejected", commandId: "unknown", error: { code: "INVALID_COMMAND", message: "Command must be an object" } };
    }
    if (!command.id || !command.type || !command.requestedBy || !command.createdAt) {
      return {
        ok: false,
        status: "rejected",
        commandId: command.id ?? "unknown",
        error: { code: "INVALID_COMMAND", message: "Command requires id, type, requestedBy, and createdAt" }
      };
    }
    return { ok: true, status: "accepted", commandId: command.id };
  }
}
