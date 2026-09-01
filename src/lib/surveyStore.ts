import {
  DEMO_ACTIVITY_LOGS,
  DEMO_INVESTIGATORS,
  DEMO_PARCELS,
} from "../data/fields";
import type {
  ActivityLog,
  ActivityType,
  CompleteSurveyInput,
  Investigator,
  NewParcelInput,
  Parcel,
  ParcelFilters,
  SurveyStage,
  SurveyStatistics,
  SurveyStatus,
  SurveyStoreState,
} from "../types";

export const SURVEY_STORAGE_KEY = "farmland-survey:state:v2";
const MAX_ACTIVITY_LOGS = 500;

type StoreListener = () => void;
type ParcelChanges = Partial<Omit<Parcel, "id" | "createdAt">>;

const listeners = new Set<StoreListener>();
let cachedState: SurveyStoreState | null = null;
let storageListenerRegistered = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `${prefix}-${randomUuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function createInitialState(): SurveyStoreState {
  return {
    version: 1,
    revision: 0,
    parcels: clone(DEMO_PARCELS),
    investigators: clone(DEMO_INVESTIGATORS),
    activities: clone(DEMO_ACTIVITY_LOGS),
    updatedAt: "2026-09-01T11:12:00+09:00",
  };
}

function isSurveyStoreState(value: unknown): value is SurveyStoreState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SurveyStoreState>;
  return (
    candidate.version === 1 &&
    typeof candidate.revision === "number" &&
    Array.isArray(candidate.parcels) &&
    Array.isArray(candidate.investigators) &&
    Array.isArray(candidate.activities) &&
    typeof candidate.updatedAt === "string"
  );
}

function readBrowserState(): SurveyStoreState | null {
  if (typeof window === "undefined") return null;

  try {
    const serialized = window.localStorage.getItem(SURVEY_STORAGE_KEY);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    return isSurveyStoreState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistBrowserState(state: SurveyStoreState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in privacy mode or when quota is exhausted.
    // The in-memory store remains usable for the current session.
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function registerStorageListener(): void {
  if (storageListenerRegistered || typeof window === "undefined") return;
  storageListenerRegistered = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== SURVEY_STORAGE_KEY) return;

    if (!event.newValue) {
      cachedState = createInitialState();
      notify();
      return;
    }

    try {
      const next: unknown = JSON.parse(event.newValue);
      if (isSurveyStoreState(next)) {
        cachedState = next;
        notify();
      }
    } catch {
      // Ignore malformed writes from another browser context.
    }
  });
}

function setState(state: SurveyStoreState): SurveyStoreState {
  cachedState = state;
  persistBrowserState(state);
  notify();
  return state;
}

function mutateState(
  updater: (state: SurveyStoreState, changedAt: string) => SurveyStoreState,
): SurveyStoreState {
  const previous = getSurveyState();
  const changedAt = nowIso();
  const updated = updater(previous, changedAt);
  return setState({
    ...updated,
    version: 1,
    revision: previous.revision + 1,
    updatedAt: changedAt,
  });
}

function makeActivity(
  type: ActivityType,
  message: string,
  parcelId: string | null,
  actorId: string | null,
  createdAt: string,
  details?: ActivityLog["details"],
): ActivityLog {
  return {
    id: makeId("activity"),
    parcelId,
    actorId,
    type,
    message,
    createdAt,
    ...(details ? { details } : {}),
  };
}

function prependActivity(
  activities: ActivityLog[],
  activity: ActivityLog,
): ActivityLog[] {
  return [activity, ...activities].slice(0, MAX_ACTIVITY_LOGS);
}

function requireParcel(state: SurveyStoreState, parcelId: string): Parcel {
  const parcel = state.parcels.find((item) => item.id === parcelId);
  if (!parcel) throw new Error(`필지를 찾을 수 없습니다: ${parcelId}`);
  return parcel;
}

function requireInvestigator(
  state: SurveyStoreState,
  investigatorId: string,
): Investigator {
  const investigator = state.investigators.find((item) => item.id === investigatorId);
  if (!investigator) throw new Error(`조사자를 찾을 수 없습니다: ${investigatorId}`);
  return investigator;
}

function assertValidPnu(pnu: string): void {
  if (!/^\d{19}$/.test(pnu)) {
    throw new Error("PNU는 숫자 19자리여야 합니다.");
  }
}

function replaceParcel(parcels: Parcel[], nextParcel: Parcel): Parcel[] {
  return parcels.map((parcel) => (parcel.id === nextParcel.id ? nextParcel : parcel));
}

export function getSurveyState(): SurveyStoreState {
  if (!cachedState) {
    cachedState = readBrowserState() ?? createInitialState();
    persistBrowserState(cachedState);
  }
  registerStorageListener();
  return cachedState;
}

export const loadSurveyState = getSurveyState;

/** Alias designed for React's `useSyncExternalStore`. */
export const getSurveySnapshot = getSurveyState;

export function subscribeSurveyStore(listener: StoreListener): () => void {
  getSurveyState();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveSurveyState(state: SurveyStoreState): SurveyStoreState {
  if (!isSurveyStoreState(state)) {
    throw new Error("저장할 조사 데이터 형식이 올바르지 않습니다.");
  }

  const current = getSurveyState();
  return setState({
    ...clone(state),
    version: 1,
    revision: Math.max(current.revision, state.revision) + 1,
    updatedAt: nowIso(),
  });
}

export function resetSurveyStore(actorId: string | null = null): SurveyStoreState {
  const resetAt = nowIso();
  const initial = createInitialState();
  const resetActivity = makeActivity(
    "store_reset",
    "데모 조사 데이터를 초기 상태로 복원했습니다.",
    null,
    actorId,
    resetAt,
  );
  return setState({
    ...initial,
    revision: (cachedState?.revision ?? 0) + 1,
    activities: prependActivity(initial.activities, resetActivity),
    updatedAt: resetAt,
  });
}

export function listParcels(filters: ParcelFilters = {}): Parcel[] {
  const query = filters.query?.trim().toLocaleLowerCase("ko-KR");
  const includesValue = <T>(actual: T, expected?: T | T[]): boolean =>
    expected === undefined ||
    (Array.isArray(expected) ? expected.includes(actual) : actual === expected);

  return getSurveyState().parcels.filter((parcel) => {
    if (
      query &&
      ![
        parcel.pnu,
        parcel.farmMapId,
        parcel.address,
        parcel.adminArea,
        parcel.crop,
      ].some((value) => value.toLocaleLowerCase("ko-KR").includes(query))
    ) {
      return false;
    }
    if (!includesValue(parcel.stage, filters.stage)) return false;
    if (!includesValue(parcel.status, filters.status)) return false;
    if (!includesValue(parcel.decision, filters.decision)) return false;
    if (
      Object.prototype.hasOwnProperty.call(filters, "assigneeId") &&
      parcel.assigneeId !== filters.assigneeId
    ) {
      return false;
    }
    if (filters.adminArea && !parcel.adminArea.includes(filters.adminArea)) return false;
    if (
      filters.minimumRiskScore !== undefined &&
      parcel.riskScore < filters.minimumRiskScore
    ) {
      return false;
    }
    return true;
  });
}

export function getParcelById(parcelId: string): Parcel | undefined {
  return getSurveyState().parcels.find((parcel) => parcel.id === parcelId);
}

export function getParcelByPnu(pnu: string): Parcel | undefined {
  return getSurveyState().parcels.find((parcel) => parcel.pnu === pnu);
}

export function createParcel(
  input: NewParcelInput,
  actorId: string | null = null,
): Parcel {
  assertValidPnu(input.pnu);
  let created!: Parcel;

  mutateState((state, changedAt) => {
    if (state.parcels.some((parcel) => parcel.pnu === input.pnu)) {
      throw new Error(`이미 등록된 PNU입니다: ${input.pnu}`);
    }
    if (input.assigneeId) requireInvestigator(state, input.assigneeId);

    created = {
      ...clone(input),
      id: input.id ?? makeId("parcel"),
      createdAt: input.createdAt ?? changedAt,
      updatedAt: input.updatedAt ?? changedAt,
    };
    const activity = makeActivity(
      "created",
      `${created.adminArea} ${created.address.split(" ").at(-1) ?? "필지"}를 등록했습니다.`,
      created.id,
      actorId,
      changedAt,
      { pnu: created.pnu },
    );
    return {
      ...state,
      parcels: [...state.parcels, created],
      activities: prependActivity(state.activities, activity),
    };
  });
  return created;
}

export function updateParcel(
  parcelId: string,
  changes: ParcelChanges,
  actorId: string | null = null,
): Parcel {
  let updated!: Parcel;

  mutateState((state, changedAt) => {
    const current = requireParcel(state, parcelId);
    if (changes.pnu) {
      assertValidPnu(changes.pnu);
      if (
        changes.pnu !== current.pnu &&
        state.parcels.some((parcel) => parcel.pnu === changes.pnu)
      ) {
        throw new Error(`이미 등록된 PNU입니다: ${changes.pnu}`);
      }
    }
    if (changes.assigneeId) requireInvestigator(state, changes.assigneeId);

    updated = {
      ...current,
      ...clone(changes),
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: changedAt,
    };
    const activity = makeActivity(
      "updated",
      `${updated.address} 필지 정보를 수정했습니다.`,
      parcelId,
      actorId,
      changedAt,
    );
    return {
      ...state,
      parcels: replaceParcel(state.parcels, updated),
      activities: prependActivity(state.activities, activity),
    };
  });
  return updated;
}

export function deleteParcel(
  parcelId: string,
  actorId: string | null = null,
): boolean {
  let deleted = false;
  mutateState((state, changedAt) => {
    const parcel = requireParcel(state, parcelId);
    deleted = true;
    const activity = makeActivity(
      "deleted",
      `${parcel.address} 필지를 삭제했습니다.`,
      parcelId,
      actorId,
      changedAt,
      { pnu: parcel.pnu },
    );
    return {
      ...state,
      parcels: state.parcels.filter((item) => item.id !== parcelId),
      activities: prependActivity(state.activities, activity),
    };
  });
  return deleted;
}

export function assignParcel(
  parcelId: string,
  assigneeId: string,
  dueDate: string | null = null,
  actorId: string | null = null,
): Parcel {
  let updated!: Parcel;
  mutateState((state, changedAt) => {
    const parcel = requireParcel(state, parcelId);
    const investigator = requireInvestigator(state, assigneeId);
    updated = {
      ...parcel,
      assigneeId,
      dueDate,
      assignedAt: changedAt,
      stage: "assignment",
      status: "assigned",
      updatedAt: changedAt,
    };
    const activity = makeActivity(
      "assigned",
      `${parcel.address} 필지를 ${investigator.name} 조사자에게 배정했습니다.`,
      parcelId,
      actorId,
      changedAt,
      { assigneeId, dueDate },
    );
    return {
      ...state,
      parcels: replaceParcel(state.parcels, updated),
      activities: prependActivity(state.activities, activity),
    };
  });
  return updated;
}

export function bulkAssignParcels(
  parcelIds: string[],
  assigneeId: string,
  dueDate: string | null = null,
  actorId: string | null = null,
): Parcel[] {
  const uniqueIds = [...new Set(parcelIds)];
  let updatedParcels: Parcel[] = [];

  mutateState((state, changedAt) => {
    const investigator = requireInvestigator(state, assigneeId);
    const selected = uniqueIds.map((id) => requireParcel(state, id));
    const selectedIds = new Set(uniqueIds);
    updatedParcels = selected.map((parcel) => ({
      ...parcel,
      assigneeId,
      dueDate,
      assignedAt: changedAt,
      stage: "assignment" as const,
      status: "assigned" as const,
      updatedAt: changedAt,
    }));
    const updates = new Map(updatedParcels.map((parcel) => [parcel.id, parcel]));
    const activity = makeActivity(
      "assigned",
      `${uniqueIds.length}개 필지를 ${investigator.name} 조사자에게 일괄 배정했습니다.`,
      null,
      actorId,
      changedAt,
      { assigneeId, parcelCount: uniqueIds.length, dueDate },
    );
    return {
      ...state,
      parcels: state.parcels.map((parcel) =>
        selectedIds.has(parcel.id) ? updates.get(parcel.id)! : parcel,
      ),
      activities: prependActivity(state.activities, activity),
    };
  });
  return updatedParcels;
}

export function unassignParcel(
  parcelId: string,
  actorId: string | null = null,
): Parcel {
  return updateParcel(
    parcelId,
    {
      assigneeId: null,
      dueDate: null,
      assignedAt: undefined,
      stage: "screening",
      status: "pending",
    },
    actorId,
  );
}

export function startSurvey(
  parcelId: string,
  actorId: string | null = null,
): Parcel {
  let updated!: Parcel;
  mutateState((state, changedAt) => {
    const parcel = requireParcel(state, parcelId);
    if (!parcel.assigneeId) {
      throw new Error("조사자를 먼저 배정해야 현장 조사를 시작할 수 있습니다.");
    }
    updated = {
      ...parcel,
      stage: "field_survey",
      status: "in_progress",
      surveyStartedAt: parcel.surveyStartedAt ?? changedAt,
      updatedAt: changedAt,
    };
    const activity = makeActivity(
      "survey_started",
      `${parcel.address} 현장 조사를 시작했습니다.`,
      parcelId,
      actorId ?? parcel.assigneeId,
      changedAt,
    );
    return {
      ...state,
      parcels: replaceParcel(state.parcels, updated),
      activities: prependActivity(state.activities, activity),
    };
  });
  return updated;
}

export function submitParcelForReview(
  parcelId: string,
  changes: Pick<Parcel, "decision" | "notes" | "reasons" | "photoCount" | "gpsVerified">,
  actorId: string | null = null,
): Parcel {
  let updated!: Parcel;
  mutateState((state, changedAt) => {
    const parcel = requireParcel(state, parcelId);
    updated = {
      ...parcel,
      ...clone(changes),
      stage: "review",
      status: "needs_review",
      updatedAt: changedAt,
    };
    const activity = makeActivity(
      "stage_changed",
      `${parcel.address} 조사 결과의 검수를 요청했습니다.`,
      parcelId,
      actorId ?? parcel.assigneeId,
      changedAt,
      { decision: changes.decision },
    );
    return {
      ...state,
      parcels: replaceParcel(state.parcels, updated),
      activities: prependActivity(state.activities, activity),
    };
  });
  return updated;
}

export function completeSurvey(
  parcelId: string,
  input: CompleteSurveyInput,
  actorId: string | null = null,
): Parcel {
  let completed!: Parcel;
  mutateState((state, changedAt) => {
    const parcel = requireParcel(state, parcelId);
    const completedAt = input.completedAt ?? changedAt;
    completed = {
      ...parcel,
      decision: input.decision,
      notes: input.notes ?? parcel.notes,
      reasons: input.reasons ? [...input.reasons] : parcel.reasons,
      photoCount: input.photoCount ?? parcel.photoCount,
      gpsVerified: input.gpsVerified ?? parcel.gpsVerified,
      stage: "completed",
      status: "completed",
      completedAt,
      updatedAt: changedAt,
    };
    const activity = makeActivity(
      "completed",
      `${parcel.address} 조사를 완료했습니다.`,
      parcelId,
      actorId ?? parcel.assigneeId,
      changedAt,
      { decision: input.decision, photoCount: completed.photoCount },
    );
    return {
      ...state,
      parcels: replaceParcel(state.parcels, completed),
      activities: prependActivity(state.activities, activity),
    };
  });
  return completed;
}

export function updateParcelStage(
  parcelId: string,
  stage: SurveyStage,
  actorId: string | null = null,
): Parcel {
  const statusByStage: Record<SurveyStage, SurveyStatus> = {
    screening: "pending",
    assignment: "assigned",
    field_survey: "in_progress",
    review: "needs_review",
    completed: "completed",
  };
  return updateParcel(parcelId, { stage, status: statusByStage[stage] }, actorId);
}

export function updateParcelStatus(
  parcelId: string,
  status: SurveyStatus,
  actorId: string | null = null,
): Parcel {
  return updateParcel(parcelId, { status }, actorId);
}

export function importParcels(
  inputs: NewParcelInput[],
  actorId: string | null = null,
): { added: Parcel[]; skippedPnus: string[] } {
  const skippedPnus: string[] = [];
  const added: Parcel[] = [];
  mutateState((state, changedAt) => {
    const knownPnus = new Set(state.parcels.map((parcel) => parcel.pnu));
    for (const input of inputs) {
      assertValidPnu(input.pnu);
      if (knownPnus.has(input.pnu)) {
        skippedPnus.push(input.pnu);
        continue;
      }
      if (input.assigneeId) requireInvestigator(state, input.assigneeId);
      const parcel: Parcel = {
        ...clone(input),
        id: input.id ?? makeId("parcel"),
        createdAt: input.createdAt ?? changedAt,
        updatedAt: input.updatedAt ?? changedAt,
      };
      knownPnus.add(parcel.pnu);
      added.push(parcel);
    }

    const activity = makeActivity(
      "imported",
      `CSV에서 ${added.length}개 필지를 가져왔습니다.`,
      null,
      actorId,
      changedAt,
      { added: added.length, skipped: skippedPnus.length },
    );
    return {
      ...state,
      parcels: [...state.parcels, ...added],
      activities: prependActivity(state.activities, activity),
    };
  });
  return { added, skippedPnus };
}

export function getSurveyStatistics(parcels = getSurveyState().parcels): SurveyStatistics {
  const byDecision: SurveyStatistics["byDecision"] = {
    pending: 0,
    cultivated: 0,
    fallow: 0,
    suspected_conversion: 0,
    non_farmland: 0,
  };
  parcels.forEach((parcel) => {
    byDecision[parcel.decision] += 1;
  });

  const completed = parcels.filter((parcel) => parcel.status === "completed").length;
  const totalAreaM2 = parcels.reduce((sum, parcel) => sum + parcel.areaM2, 0);
  const surveyedAreaM2 = parcels
    .filter((parcel) => parcel.status === "completed")
    .reduce((sum, parcel) => sum + parcel.areaM2, 0);

  return {
    total: parcels.length,
    unassigned: parcels.filter((parcel) => parcel.assigneeId === null).length,
    inProgress: parcels.filter((parcel) => parcel.status === "in_progress").length,
    needsReview: parcels.filter((parcel) => parcel.status === "needs_review").length,
    completed,
    completionRate: parcels.length ? Number(((completed / parcels.length) * 100).toFixed(1)) : 0,
    totalAreaM2,
    surveyedAreaM2,
    highRisk: parcels.filter((parcel) => parcel.riskScore >= 70).length,
    byDecision,
  };
}

export const surveyStore = {
  getState: getSurveyState,
  load: loadSurveyState,
  getSnapshot: getSurveySnapshot,
  subscribe: subscribeSurveyStore,
  save: saveSurveyState,
  reset: resetSurveyStore,
  listParcels,
  getParcelById,
  getParcelByPnu,
  createParcel,
  updateParcel,
  deleteParcel,
  assignParcel,
  bulkAssignParcels,
  unassignParcel,
  startSurvey,
  submitParcelForReview,
  completeSurvey,
  updateParcelStage,
  updateParcelStatus,
  importParcels,
  getStatistics: getSurveyStatistics,
};

export default surveyStore;
