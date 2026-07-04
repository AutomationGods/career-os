export type DomainStatus = "placeholder" | "partial" | "implemented" | "deprecated" | "disabled";

export type CommandStatus = "accepted" | "completed" | "failed" | "rejected" | "requires_approval";
export type CommandRequester = "user" | "system" | "worker" | "api" | "scheduler";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type PermissionDecisionStatus = "allowed" | "denied" | "requires_approval";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";
export type ApprovalReplayStatus = "not_started" | "in_progress" | "completed" | "failed";

export type PermissionName =
  | "read_jobs"
  | "write_jobs"
  | "read_gmail"
  | "write_gmail_draft"
  | "send_email"
  | "read_calendar"
  | "write_calendar"
  | "generate_resume"
  | "export_document"
  | "export_document_for_submission"
  | "use_browser"
  | "upload_file"
  | "submit_application"
  | "contact_recruiter"
  | "contact_recruiter_first_time"
  | "answer_sensitive_questions"
  | "modify_master_profile"
  | "create_followup"
  | "schedule_followup"
  | "auto_send_followup";

export interface PermissionDecision {
  status: PermissionDecisionStatus;
  permission: PermissionName | string;
  reason: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

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
  approvalRequestId?: string;
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

export interface DomainRuntimeTestsDescriptor {
  unit: boolean;
  integration: boolean;
  e2e: boolean;
}

export interface DomainRuntimeDescriptor {
  domainId: string;
  displayName: string;
  managerId: string;
  commands: string[];
  capabilities: string[];
  workers: string[];
  tools: string[];
  eventsProduced: string[];
  stateProjections: string[];
  stateProjectionDependencies?: string[];
  dependencies?: string[];
  approvalRequired: boolean;
  gated: boolean;
  disabled: boolean;
  uiVisible: boolean;
  tests: DomainRuntimeTestsDescriptor;
}

export interface Logger {
  info?(message: string, metadata?: Record<string, unknown>): void;
  warn?(message: string, metadata?: Record<string, unknown>): void;
  error?(message: string, metadata?: Record<string, unknown>): void;
}

export interface PermissionService {
  evaluate(command: CareerCommand): PermissionDecision | Promise<PermissionDecision>;
}

export interface ApprovalRequestInput {
  id?: string;
  userId?: string;
  commandId: string;
  commandType: string;
  permission: string;
  entityType?: string;
  entityId?: string;
  status?: ApprovalStatus;
  riskLevel: RiskLevel;
  reason: string;
  requestPayload?: unknown;
  decisionPayload?: unknown;
  replayStatus?: ApprovalReplayStatus;
  replayedCommandId?: string;
  replayResult?: unknown;
  replayError?: unknown;
  replayAttemptCount?: number;
  requestedBy: CommandRequester;
  requestedAt?: Date;
  decidedAt?: Date;
  expiresAt?: Date;
  replayedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApprovalRequestRecord extends ApprovalRequestInput {
  id: string;
  userId: string;
  status: ApprovalStatus;
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
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
