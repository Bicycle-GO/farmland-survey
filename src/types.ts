/** A WGS84 point. Named fields avoid latitude/longitude tuple-order bugs. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

export type SurveyStage =
  | "screening"
  | "assignment"
  | "field_survey"
  | "review"
  | "completed";

export type SurveyStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "needs_review"
  | "completed";

export type SurveyDecision =
  | "pending"
  | "cultivated"
  | "fallow"
  | "suspected_conversion"
  | "non_farmland";

export type FarmlandCategory = "논" | "밭" | "과수원" | "시설재배" | "기타";

export const SURVEY_STAGE_LABELS: Record<SurveyStage, string> = {
  screening: "대상 선별",
  assignment: "조사 배정",
  field_survey: "현장 조사",
  review: "결과 검수",
  completed: "조사 완료",
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  pending: "미배정",
  assigned: "배정 완료",
  in_progress: "조사 중",
  needs_review: "검수 필요",
  completed: "완료",
};

export const SURVEY_DECISION_LABELS: Record<SurveyDecision, string> = {
  pending: "미판정",
  cultivated: "정상 경작",
  fallow: "휴경",
  suspected_conversion: "불법 전용 의심",
  non_farmland: "비농지",
};

export const STAGE_LABELS = SURVEY_STAGE_LABELS;
export const STATUS_LABELS = SURVEY_STATUS_LABELS;
export const DECISION_LABELS = SURVEY_DECISION_LABELS;

export const SURVEY_STAGE_ORDER: SurveyStage[] = [
  "screening",
  "assignment",
  "field_survey",
  "review",
  "completed",
];

export interface Parcel {
  id: string;
  /** 19-digit Parcel Number (필지고유번호). */
  pnu: string;
  /** Identifier shown by the Farm Map source. */
  farmMapId: string;
  address: string;
  adminArea: string;
  areaM2: number;
  farmAreaM2: number;
  /** Percentage (0-100) of cadastral land overlapping the Farm Map polygon. */
  overlapRate: number;
  category: FarmlandCategory;
  crop: string;
  stage: SurveyStage;
  status: SurveyStatus;
  decision: SurveyDecision;
  /** Screening risk score, from 0 (low) to 100 (high). */
  riskScore: number;
  assigneeId: string | null;
  dueDate: string | null;
  /** Closed polygon in WGS84 latitude/longitude. */
  coordinates: GeoPoint[];
  photoCount: number;
  gpsVerified: boolean;
  updatedAt: string;
  reasons: string[];
  notes: string;
  createdAt: string;
  assignedAt?: string;
  surveyStartedAt?: string;
  completedAt?: string;
}

export type InvestigatorRole = "manager" | "lead" | "surveyor" | "reviewer";
export type InvestigatorStatus = "available" | "in_field" | "off_duty";

export interface Investigator {
  id: string;
  name: string;
  role: InvestigatorRole;
  team: string;
  phone: string;
  coverageAreas: string[];
  status: InvestigatorStatus;
  color: string;
}

export type ActivityType =
  | "created"
  | "updated"
  | "assigned"
  | "survey_started"
  | "stage_changed"
  | "status_changed"
  | "completed"
  | "deleted"
  | "imported"
  | "store_reset";

export interface ActivityLog {
  id: string;
  parcelId: string | null;
  actorId: string | null;
  type: ActivityType;
  message: string;
  createdAt: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface SurveyStoreState {
  version: 1;
  revision: number;
  parcels: Parcel[];
  investigators: Investigator[];
  activities: ActivityLog[];
  updatedAt: string;
}

export type NewParcelInput = Omit<Parcel, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export interface CompleteSurveyInput {
  decision: Exclude<SurveyDecision, "pending">;
  notes?: string;
  reasons?: string[];
  photoCount?: number;
  gpsVerified?: boolean;
  completedAt?: string;
}

export interface ParcelFilters {
  query?: string;
  stage?: SurveyStage | SurveyStage[];
  status?: SurveyStatus | SurveyStatus[];
  decision?: SurveyDecision | SurveyDecision[];
  assigneeId?: string | null;
  adminArea?: string;
  minimumRiskScore?: number;
}

export interface SurveyStatistics {
  total: number;
  unassigned: number;
  inProgress: number;
  needsReview: number;
  completed: number;
  completionRate: number;
  totalAreaM2: number;
  surveyedAreaM2: number;
  highRisk: number;
  byDecision: Record<SurveyDecision, number>;
}

// Domain-friendly aliases for consumers that prefer Korean-survey terminology.
export type FarmlandParcel = Parcel;
export type SurveyActivity = ActivityLog;
