import { eventStore } from "@career-os/events";
import { snapshotStore } from "@career-os/snapshots";
import { stateStore } from "@career-os/state";
import { fail } from "./responses";

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export class StoreReadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "StoreReadError";
  }
}

export function isLocalReadRequest(request: Request) {
  return localHosts.has(new URL(request.url).hostname);
}

export function isPersistentStoreUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("can't reach database server") || message.includes("database server") || message.includes("p1001") || message.includes("connection refused") || message.includes("localhost:55434") || message.includes("too many database connections") || message.includes("too many clients already");
}

export function shouldUseLocalMemoryStoreReads() {
  return process.env.CAREER_OS_COMMAND_RUNTIME === "local-memory";
}

export async function readWithLocalFallback<T>(request: Request, durableRead: () => T | Promise<T>, localRead: () => T | Promise<T>, unavailableMessage: string) {
  if (shouldUseLocalMemoryStoreReads()) return await localRead();

  try {
    return await durableRead();
  } catch (error) {
    if (isPersistentStoreUnavailable(error)) {
      if (isLocalReadRequest(request)) return await localRead();
      throw new StoreReadError(unavailableMessage, 503);
    }
    throw new StoreReadError("Unable to read the requested data store.", 500);
  }
}

export function storeReadFailure(error: unknown, code: string) {
  if (error instanceof StoreReadError) return fail(error.message, code, error.status);
  return fail("Unable to read the requested data store.", code, 500);
}

export const localReadStores = {
  events: eventStore,
  state: stateStore,
  snapshots: snapshotStore
};
