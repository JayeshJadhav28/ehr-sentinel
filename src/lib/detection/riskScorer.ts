import { DETECTION_CONFIG } from "@/lib/constants";

const MIN_RISK_SCORE = 0;
const MAX_RISK_SCORE = 100;

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

  // Guard against NaN/Infinity from the model so the score stays a finite number.
  const mlScore = Number.isFinite(input.mlScoreComponent) ? input.mlScoreComponent : 0;
  const mlPoints = Math.round(mlScore * cfg.mlWeight);
  risk += mlPoints;
  lines.push({ label: "Model-derived signal contribution", value: mlPoints });

  if (input.legitimateContext) {
    risk -= cfg.legitimateContextRelief;
    lines.push({ label: "Legitimate context relief", value: -cfg.legitimateContextRelief });
  }

  return { score: Math.max(MIN_RISK_SCORE, Math.min(MAX_RISK_SCORE, risk)), lines };
}