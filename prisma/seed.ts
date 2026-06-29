import { readFeatureFlags } from "@career-os/config";

const flags = readFeatureFlags();

if (process.env.NODE_ENV === "production" && !flags.ENABLE_PRODUCTION_DEMO_DATA) {
  console.log("Production demo seed data is disabled; no records created.");
} else {
  console.log("No default seed data configured. Add launch-safe fixtures here only when explicitly needed.");
}
