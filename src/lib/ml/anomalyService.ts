import { DETECTION_CONFIG } from "@/lib/constants";
import {
  FEATURE_KEYS,
  type AnomalyDetectionService,
  type AnomalyResult,
  type BaselineType,
  type BehavioralFeatures,
  type FeatureContribution,
} from "@/lib/types/behavior";
import { IsolationForest } from "./isolationForest";

/** Deterministic synthetic "normal behaviour" training sample (features-v1). */
function buildTrainingSet(): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < 240; i += 1) {
    const j = (i * 37) % 97;
    rows.push([
      j % 11 === 0 ? 1 : 0, // failed_logins_5m
      4 + (j % 14), // records_returned_15m
      1 + (j % 6), // unique_patients_1h
      0, // off_scope_attempts_1h
      j % 17 === 0 ? 0.2 : 0, // after_hours_ratio
      (j % 5) / 100, // department_change_rate
      0.6 + (j % 9) / 10, // records_vs_user_mean
      0.2 + (j % 7) / 10, // session_action_burst
      j % 23 === 0 ? 1 : 0, // new_source_flag
    ]);
  }
  return rows;
}

let forest: IsolationForest | null = null;
function getForest(): IsolationForest {
  if (!forest) forest = new IsolationForest(buildTrainingSet(), 120, 64, 20260101);
  return forest;
}

function toVector(f: BehavioralFeatures): number[] {
  return FEATURE_KEYS.map((k) => f[k]);
}

/**
 * Development adapter: in-process Isolation Forest (TypeScript).
 * Swap for `PythonIsolationForestAdapter` by setting ML_SERVICE_URL.
 */
export class LocalIsolationForestAdapter implements AnomalyDetectionService {
  readonly adapter = "isolation-forest-ts";

  async score(features: BehavioralFeatures, baselineType: BaselineType): Promise<AnomalyResult> {
    const vector = toVector(features);
    const base = getForest();
    const anomalyScore = Number(base.score(vector).toFixed(3));

    // Feature contribution = score change when the feature is reset to its
    // training-set centre (a leave-one-out perturbation, not a SHAP value).
    const neutral = [0, 8, 3, 0, 0, 0, 1, 0.4, 0];
    const contributions: FeatureContribution[] = FEATURE_KEYS.map((key, idx) => {
      const perturbed = [...vector];
      perturbed[idx] = neutral[idx] ?? 0;
      const delta = anomalyScore - base.score(perturbed);
      return { feature: key, value: vector[idx] ?? 0, contribution: Number(delta.toFixed(4)) };
    })
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5);

    const top = contributions.filter((c) => c.contribution > 0).map((c) => c.feature);

    return {
      anomalyScore,
      modelVersion: DETECTION_CONFIG.modelVersion,
      featureContributions: contributions,
      baselineType,
      adapter: this.adapter,
      explanation: top.length
        ? `Model-derived signal ${anomalyScore.toFixed(2)} against the ${baselineType.toLowerCase()} baseline. Largest contributing features: ${top.join(", ")}.`
        : `Model-derived signal ${anomalyScore.toFixed(2)} against the ${baselineType.toLowerCase()} baseline. No feature stands out from the training distribution.`,
    };
  }
}

/**
 * Production adapter placeholder. Calls an external Python service exposing
 * POST /score with the identical features-v1 body. Not active unless
 * ML_SERVICE_URL is configured; see docs/ml-design.md.
 */
export class PythonIsolationForestAdapter implements AnomalyDetectionService {
  readonly adapter = "isolation-forest-python";

  constructor(private readonly baseUrl: string) {}

  async score(features: BehavioralFeatures, baselineType: BaselineType): Promise<AnomalyResult> {
    const response = await fetch(`${this.baseUrl}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schema: DETECTION_CONFIG.featureSchemaVersion, features, baselineType }),
    });
    if (!response.ok) throw new Error(`ML service responded ${response.status}`);
    return (await response.json()) as AnomalyResult;
  }
}

export function getAnomalyDetectionService(): AnomalyDetectionService {
  const url = typeof process !== "undefined" ? process.env["ML_SERVICE_URL"] : undefined;
  if (url) return new PythonIsolationForestAdapter(url);
  return new LocalIsolationForestAdapter();
}
