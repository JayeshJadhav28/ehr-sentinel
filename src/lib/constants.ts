import type { ScenarioDefinition } from "./types/scenario";

/**
 * Prototype detection configuration.
 * These are demonstration values, NOT medical, security or regulatory standards.
 */
export const DETECTION_CONFIG = {
  configVersion: "detect-config-v1",
  featureSchemaVersion: "features-v1",
  modelVersion: "demo-v1",
  authBrute: {
    windowMinutes: 5,
    failureThreshold: 5,
    escalationFailures: 10,
    escalationDistinctIps: 3,
  },
  bulkAccess: {
    windowMinutes: 15,
    sigma: 3,
    sparseBaselineFallback: 25,
    minSampleSize: 12,
  },
  workingHours: { start: 7, end: 20 },
  risk: {
    authBrute: 45,
    bulkAccess: 25,
    scopeViolation: 40,
    mlWeight: 20,
    legitimateContextRelief: 20,
  },
} as const;

export const DEMO_ACCOUNTS = [
  { username: "physician.demo", label: "Dr. A. Kumar", role: "Physician", context: "Cardiology" },
  { username: "emergency.demo", label: "Dr. R. Mehta", role: "Physician", context: "Emergency" },
  { username: "nurse.demo", label: "N. Pereira", role: "Nurse", context: "General Medicine" },
  { username: "specialist.demo", label: "Dr. S. Iyer", role: "Specialist", context: "Oncology" },
  { username: "security.demo", label: "R. Fernandes", role: "Security Reviewer", context: "Security domain" },
  { username: "admin.demo", label: "M. Dsouza", role: "Administrator", context: "Aggregate only" },
] as const;

/** Demo-only shared password. Defined here as seed/demo configuration, never a real credential. */
export const DEMO_PASSWORD = "Sentinel#2026";

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "NORMAL",
    name: "Normal Activity",
    actor: "Dr. A. Kumar (Physician, Cardiology)",
    description: "Authorised access to assigned Cardiology patients during working hours.",
    expectation: "Audit events only. No alert.",
    expectedOutcome: "NO_ALERT",
  },
  {
    id: "BRUTE_FORCE",
    name: "Brute Force",
    actor: "physician.demo account",
    description: "7 failed authentication attempts inside 5 minutes from 3 source addresses.",
    expectation: "AUTH_BRUTE, HIGH severity.",
    expectedOutcome: "ALERT",
  },
  {
    id: "BULK_ACCESS",
    name: "Bulk Access",
    actor: "Dr. A. Kumar (Physician, Cardiology)",
    description: "42 record retrievals inside 4 minutes, far above the user's baseline.",
    expectation: "BULK_RECORD_ACCESS.",
    expectedOutcome: "ALERT",
  },
  {
    id: "SCOPE_VIOLATION",
    name: "Scope Violation",
    actor: "Dr. A. Kumar (Physician, Cardiology)",
    description: "Attempted access to Oncology patients outside the assigned care scope.",
    expectation: "Server-side denial + ROLE_SCOPE_VIOLATION.",
    expectedOutcome: "ALERT",
  },
  {
    id: "COMBINED_ATTACK",
    name: "Combined Attack",
    actor: "Dr. A. Kumar (Physician, Cardiology)",
    description: "02:10 session: failed logins, 150 out-of-scope retrievals, repeated denials, new source address.",
    expectation: "Multiple rules, highest risk indicator.",
    expectedOutcome: "ALERT",
  },
  {
    id: "BUSY_CLINICIAN",
    name: "Busy Clinician",
    actor: "Dr. R. Mehta (Emergency Physician)",
    description: "45 records across 20 minutes at 14:20, all assigned, all authorised.",
    expectation: "High activity recognised as benign. No suspicious alert.",
    expectedOutcome: "NO_ALERT",
  },
];

export const NAV_ITEMS = [
  { to: "/overview", label: "Overview", resource: "OVERVIEW" },
  { to: "/patients", label: "Patients", resource: "PATIENT" },
  { to: "/audit", label: "Audit Explorer", resource: "AUDIT_EVENT" },
  { to: "/alerts", label: "Security Alerts", resource: "SECURITY_ALERT" },
  { to: "/behavior", label: "Behavior", resource: "BEHAVIOR_PROFILE" },
  { to: "/scenarios", label: "Scenario Replay", resource: "SCENARIO" },
] as const;
