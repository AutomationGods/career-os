import { trustedModeConfig } from "@career-os/config";
import type { CareerCommand, PermissionDecision, PermissionName, PermissionService, RiskLevel } from "@career-os/shared";

export const supportedPermissions: PermissionName[] = [
  "read_jobs",
  "write_jobs",
  "read_gmail",
  "write_gmail_draft",
  "send_email",
  "read_calendar",
  "write_calendar",
  "generate_resume",
  "export_document",
  "export_document_for_submission",
  "use_browser",
  "upload_file",
  "submit_application",
  "contact_recruiter",
  "contact_recruiter_first_time",
  "answer_sensitive_questions",
  "modify_master_profile",
  "create_followup",
  "schedule_followup",
  "auto_send_followup"
];

export const approvalRequiredPermissions = new Set<PermissionName>([
  "send_email",
  "submit_application",
  "upload_file",
  "contact_recruiter",
  "contact_recruiter_first_time",
  "answer_sensitive_questions",
  "modify_master_profile",
  "use_browser",
  "export_document_for_submission",
  "auto_send_followup",
  "write_calendar"
]);

export const developmentAllowedPermissions = new Set<PermissionName>([
  "read_jobs",
  "write_jobs",
  "generate_resume",
  "export_document",
  "create_followup",
  "schedule_followup"
]);

export const protectedCommandPermissions: Record<string, PermissionName> = {
  "job_discovery.search": "read_jobs",
  "jobs.run_pipeline": "write_jobs",
  "daily_mission.generate": "read_jobs",
  "application_packets.create": "export_document",
  "application_packets.generate_placeholders": "export_document",
  "application_packets.update_status": "export_document",
  "resume.generate": "generate_resume",
  "resume.generate_placeholder": "generate_resume",
  "relationships.dedupe": "read_jobs",
  "email.send": "send_email",
  "gmail.read": "read_gmail",
  "gmail.draft": "write_gmail_draft",
  "calendar.write": "write_calendar",
  "browser.use": "use_browser",
  "documents.export": "export_document",
  "documents.export_for_submission": "export_document_for_submission",
  "files.upload": "upload_file",
  "application.submit": "submit_application",
  "application.auto_submit": "submit_application",
  "recruiter.contact": "contact_recruiter",
  "recruiter.contact_first_time": "contact_recruiter_first_time",
  "application.answer_sensitive_questions": "answer_sensitive_questions",
  "profile.modify_master": "modify_master_profile",
  "followup.create": "create_followup",
  "followup.schedule": "schedule_followup",
  "followup.auto_send": "auto_send_followup"
};

const criticalPermissions = new Set<PermissionName>(["submit_application", "auto_send_followup", "send_email"]);
const highRiskPermissions = new Set<PermissionName>(["use_browser", "upload_file", "contact_recruiter", "contact_recruiter_first_time", "answer_sensitive_questions", "modify_master_profile", "export_document_for_submission", "write_calendar"]);

function riskFor(permission: PermissionName | string): RiskLevel {
  if (criticalPermissions.has(permission as PermissionName)) return "critical";
  if (highRiskPermissions.has(permission as PermissionName)) return "high";
  if (approvalRequiredPermissions.has(permission as PermissionName)) return "medium";
  return "low";
}

function permissionFromUnknownCommand(command: CareerCommand): PermissionName | undefined {
  const text = `${command.type} ${command.entityType ?? ""}`.toLowerCase();
  if (text.includes("auto_submit") || text.includes("submit")) return "submit_application";
  if (text.includes("send") && text.includes("email")) return "send_email";
  if (text.includes("browser")) return "use_browser";
  if (text.includes("upload")) return "upload_file";
  if (text.includes("calendar") && text.includes("write")) return "write_calendar";
  if (text.includes("sensitive")) return "answer_sensitive_questions";
  if (text.includes("recruiter") && text.includes("first")) return "contact_recruiter_first_time";
  if (text.includes("recruiter") || text.includes("outreach")) return "contact_recruiter";
  return undefined;
}

export function getPermissionForCommand(command: CareerCommand): PermissionName | string {
  const explicit = command.metadata?.permission;
  if (typeof explicit === "string") return explicit;
  return protectedCommandPermissions[command.type] ?? permissionFromUnknownCommand(command) ?? "unregistered_command";
}

export function getPolicyCommandTypes() {
  return Object.keys(protectedCommandPermissions).sort();
}

export class PermissionPolicyService implements PermissionService {
  constructor(private readonly config: Record<string, unknown> = trustedModeConfig) {}

  evaluate(command: CareerCommand): PermissionDecision {
    const permission = getPermissionForCommand(command);
    const riskLevel = riskFor(permission);

    if (command.type === "application.auto_submit" && this.config.auto_submit_enabled !== true) {
      return {
        status: "denied",
        permission,
        reason: "Auto-submit is disabled by policy.",
        riskLevel: "critical",
        requiresApproval: false
      };
    }

    if (command.metadata?.approvalReplay === true && command.metadata.approvalStatus === "approved" && command.metadata.approvalPermission === permission) {
      return {
        status: "allowed",
        permission,
        reason: "Approved replay verified for this permission.",
        riskLevel,
        requiresApproval: false
      };
    }

    if (permission === "send_email" && this.config.auto_send_enabled === true && this.config.require_approval_before_send !== true) {
      return { status: "allowed", permission, reason: "Email sending explicitly allowed by policy.", riskLevel, requiresApproval: false };
    }

    if (developmentAllowedPermissions.has(permission as PermissionName)) {
      return { status: "allowed", permission, reason: "Permission is allowed in current development policy.", riskLevel, requiresApproval: false };
    }

    if (permission === "unregistered_command") {
      return { status: "allowed", permission, reason: "Permission policy has no sensitive match; registry decides command availability.", riskLevel: "low", requiresApproval: false };
    }

    if (approvalRequiredPermissions.has(permission as PermissionName)) {
      return {
        status: "requires_approval",
        permission,
        reason: "Sensitive permission requires human approval before execution",
        riskLevel,
        requiresApproval: true
      };
    }

    return {
      status: "requires_approval",
      permission,
      reason: "Unrecognized permission defaults to approval before execution.",
      riskLevel: "medium",
      requiresApproval: true
    };
  }
}
