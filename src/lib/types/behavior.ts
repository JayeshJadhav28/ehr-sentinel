export interface BehavioralFeatures {
  failed_logins_5m: number;
  records_returned_15m: number;
  unique_patients_1h: number;
  off_scope_attempts_1h: number;
  after_hours_ratio: number;
  department_change_rate: number;
  records_vs_user_mean: number;
  session_action_burst: number;
  new_source_flag: number;
}

export const FEATURE_KEYS: (keyof BehavioralFeatures)[] = [
  "failed_logins_5m",
  "records_returned_15m",
  "unique_patients_1h",
  "off_scope_attempts_1h",
  "after_hours_ratio",
  "department_change_rate",
  "records_vs_user_mean",
  "session_action_burst",
  "new_source_flag",
];

export interface FeatureContribution {
  feature: keyof BehavioralFeatures;
  value: number;
  contribution: number;
}

export type BaselineType = "USER" | "ROLE" | "GLOBAL";

export interface AnomalyResult {
  anomalyScore: number;
  modelVersion: string;
  featureContributions: FeatureContribution[];
  baselineType: BaselineType;
  explanation: string;
  adapter: string;
}

export interface AnomalyDetectionService {
  score(features: BehavioralFeatures, baselineType: BaselineType): Promise<AnomalyResult>;
}

export interface BehaviorProfile {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  windowDays: number;
  loginRate: number;
  avgRecordsPerAction: number;
  stdRecordsPerAction: number;
  avgRecordsPerHour: number;
  uniquePatientsPerSession: number;
  commonHours: number[];
  failedLoginRate: number;
  sampleSize: number;
  modelVersion: string;
  baselineType: BaselineType;
}

export interface BehaviorSnapshot {
  profile: BehaviorProfile;
  current: {
    recordsLast24h: number;
    uniquePatients24h: number;
    failedLogins24h: number;
    deniedAttempts24h: number;
    peakRecordsInWindow: number;
    peakWindowMinutes: number;
  };
  features: BehavioralFeatures;
  ml: AnomalyResult;
  hourHistogram: { hour: number; baseline: number; current: number }[];
}
