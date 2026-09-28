import { DETECTION_CONFIG } from "@/lib/constants";

export interface RiskInput {
  authBrute: boolean;
  bulkAccess: boolean;
  scopeViolation: boolean;
  mlScoreComponent: number;
  legitimateContext: boolean;
}

export interface RiskBreakdown {
  score: number;
  lines: { label: string; value: number }[];
}

/** Prototype risk indicator. Not a clinical, medical or regulatory score. */
export function scoreRisk(input: RiskInput): RiskBreakdown {
  const cfg = DETECTION_CONFIG.risk;
  const lines: { label: string; value: number }[] = [];
  let risk = 0;

  if (input.authBrute) {
    risk += cfg.authBrute;
    lines.push({ label: "AUTH_BRUTE triggered", value: cfg.authBrute });
  }
  if (input.bulkAccess) {
    risk += cfg.bulkAccess;
    lines.push({ label: "BULK_RECORD_ACCESS triggered", value: cfg.bulkAccess });
  }
  if (input.scopeViolation) {
    risk += cfg.scopeViolation;
    lines.push({ label: "ROLE_SCOPE_VIOLATION triggered", value: cfg.scopeViolation });
  }

  const mlPoints = Math.round(input.mlScoreComponent * cfg.mlWeight);
  risk += mlPoints;
  lines.push({ label: "Model-derived signal contribution", value: mlPoints });

  if (input.legitimateContext) {
    risk -= cfg.legitimateContextRelief;
    lines.push({ label: "Legitimate context relief", value: -cfg.legitimateContextRelief });
  }

  return { score: Math.max(0, Math.min(100, risk)), lines };
}
