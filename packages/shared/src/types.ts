export type DomainStatus = "placeholder" | "partial" | "implemented" | "deprecated" | "disabled";

export type CommandStatus = "accepted" | "completed" | "failed" | "rejected" | "requires_approval";
export type CommandRequester = "user" | "system" | "worker" | "api" | "scheduler";

export interface CareerCommand<TPayload = unknown> {
  id: string;
  type: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  domain?: string;
  payload: TPayload;
  requestedBy: CommandRequester;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CommandError {
  code: string;
  message: string;
  details?: unknown;
}

export interface CommandResult<TData = unknown> {
  ok: boolean;
  status: CommandStatus;
  commandId: string;
  data?: TData;
  error?: CommandError;
  emittedEvents?: string[];
  updatedProjections?: string[];
}

export interface DomainCommand {
  name: string;
  description?: string;
  inputSchema?: string;
}

export interface DomainEvent {
  name: string;
  description?: string;
  producesStateProjection?: boolean;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  permissions: string[];
}

export interface WorkerDefinition {
  name: string;
  description?: string;
  tools: string[];
  emits: string[];
}

export interface CapabilityDefinition {
  name: string;
  description?: string;
  workers: string[];
  commands: string[];
  events: string[];
  permissions: string[];
}

export interface Logger {
  info?(message: string, metadata?: Record<string, unknown>): void;
  warn?(message: string, metadata?: Record<string, unknown>): void;
  error?(message: string, metadata?: Record<string, unknown>): void;
}

export interface PermissionService {
  canExecute(command: CareerCommand): boolean | Promise<boolean>;
}

export interface ConfigService {
  get(key: string): unknown;
}

export interface DomainExecutionContext {
  eventStore: unknown;
  stateStore: unknown;
  snapshotStore: unknown;
  logger?: Logger;
  permissions?: PermissionService;
  config?: ConfigService;
}

export interface DomainManagerContract {
  domainName: string;
  domainSlug: string;
  capabilities: CapabilityDefinition[];
  canHandle(command: CareerCommand): boolean;
  handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult>;
}

export interface StateProjection<T = unknown> {
  projectionType: string;
  entityType: string;
  entityId: string;
  state: T;
  updatedAt: Date;
}

export interface DomainDefinition {
  name: string;
  slug: string;
  manager: string;
  capabilities: string[];
  workers: string[];
  tools: string[];
  commands: string[];
  events: string[];
  permissions: string[];
  dependencies: string[];
  status: DomainStatus;
  version: string;
}

export type JobSegment =
  | "Remote Commercial"
  | "Hybrid Commercial"
  | "Onsite Commercial"
  | "Contract"
  | "Clearance / Government"
  | "Public Trust"
  | "Secret"
  | "Top Secret"
  | "TS/SCI"
  | "Polygraph"
  | "Clearance Eligible"
  | "Unknown Clearance Risk"
  | "Low Fit"
  | "Archived / Rejected";

export interface NormalizedJob {
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  employmentType?: string;
  source: string;
  raw: unknown;
}
