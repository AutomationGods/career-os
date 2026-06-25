export type DomainStatus = "placeholder" | "phase_1" | "active";
export type JobSegment =
  | "Remote Commercial" | "Hybrid Commercial" | "Onsite Commercial" | "Contract"
  | "Clearance / Government" | "Public Trust" | "Secret" | "Top Secret" | "TS/SCI"
  | "Polygraph" | "Clearance Eligible" | "Unknown Clearance Risk" | "Low Fit" | "Archived / Rejected";
export interface DomainDefinition { name:string; slug:string; manager:string; capabilities:string[]; workers:string[]; commands:string[]; events:string[]; permissions:string[]; dependencies:string[]; status:DomainStatus; version:string; }
export interface NormalizedJob { title:string; company:string; location?:string; description?:string; url?:string; employmentType?:string; source:string; raw:unknown; }
