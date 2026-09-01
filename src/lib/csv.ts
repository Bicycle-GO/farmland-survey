import {
  SURVEY_DECISION_LABELS,
  SURVEY_STAGE_LABELS,
  SURVEY_STATUS_LABELS,
} from "../types";
import type {
  FarmlandCategory,
  GeoPoint,
  Investigator,
  NewParcelInput,
  Parcel,
} from "../types";

export interface CsvImportError {
  row: number;
  column?: string;
  value?: string;
  message: string;
}

export interface PnuCsvRow {
  row: number;
  pnu: string;
  farmMapId?: string;
  address?: string;
  adminArea?: string;
  areaM2?: number;
  farmAreaM2?: number;
  overlapRate?: number;
  category?: FarmlandCategory;
  crop?: string;
  riskScore?: number;
  coordinates?: GeoPoint[];
}

export interface PnuCsvParseResult {
  rows: PnuCsvRow[];
  errors: CsvImportError[];
}

export interface PnuCsvImportOptions {
  existingParcels?: readonly Parcel[];
  defaultAssigneeId?: string | null;
  defaultDueDate?: string | null;
}

export interface PnuCsvImportResult extends PnuCsvParseResult {
  parcels: NewParcelInput[];
  skippedPnus: string[];
}

type ColumnKey =
  | "pnu"
  | "farmMapId"
  | "address"
  | "adminArea"
  | "areaM2"
  | "farmAreaM2"
  | "overlapRate"
  | "category"
  | "crop"
  | "riskScore"
  | "latitude"
  | "longitude"
  | "coordinates";

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  pnu: ["pnu", "필지고유번호", "고유번호", "토지pnu"],
  farmMapId: ["farmmapid", "팜맵id", "팜맵아이디", "팜맵필지id"],
  address: ["address", "주소", "소재지", "필지주소"],
  adminArea: ["adminarea", "행정구역", "행정리", "읍면동", "법정리"],
  areaM2: ["aream2", "면적", "면적m2", "면적㎡", "지적면적", "지적면적㎡"],
  farmAreaM2: ["farmaream2", "농지면적", "농지면적m2", "팜맵면적", "팜맵면적㎡"],
  overlapRate: ["overlaprate", "중첩률", "팜맵중첩률", "중복률"],
  category: ["category", "유형", "농지유형", "지목"],
  crop: ["crop", "작물", "재배작물", "품목"],
  riskScore: ["riskscore", "위험도", "위험점수", "리스크점수"],
  latitude: ["latitude", "lat", "위도"],
  longitude: ["longitude", "lng", "lon", "경도"],
  coordinates: ["coordinates", "polygon", "좌표", "폴리곤", "경계좌표"],
};

const CATEGORY_ALIASES: Record<string, FarmlandCategory> = {
  논: "논",
  답: "논",
  밭: "밭",
  전: "밭",
  과수원: "과수원",
  과수: "과수원",
  시설재배: "시설재배",
  시설: "시설재배",
  하우스: "시설재배",
  기타: "기타",
};

export const PARCEL_CSV_HEADERS = [
  "PNU",
  "팜맵ID",
  "주소",
  "행정구역",
  "지적면적㎡",
  "농지면적㎡",
  "중첩률%",
  "농지유형",
  "작물",
  "조사단계",
  "진행상태",
  "판정",
  "위험점수",
  "담당조사자",
  "완료기한",
  "사진수",
  "GPS검증",
  "위험사유",
  "메모",
  "경계좌표",
  "수정일시",
] as const;

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s_\-().%]/g, "");
}

function findColumn(headers: string[], key: ColumnKey): number {
  const aliases = new Set(HEADER_ALIASES[key].map(normalizeHeader));
  return headers.findIndex((header) => aliases.has(normalizeHeader(header)));
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function cleanPnu(value: string): string {
  const trimmed = value.trim();
  const excelFormulaMatch = trimmed.match(/^=["'](\d{19})["']$/);
  if (excelFormulaMatch) return excelFormulaMatch[1];
  return trimmed.replace(/^['\t]/, "").replace(/[\s-]/g, "");
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.replace(/[,㎡%\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseCategory(value: string | undefined): FarmlandCategory | undefined {
  if (!value?.trim()) return undefined;
  return CATEGORY_ALIASES[value.trim()] ?? "기타";
}

function parseCoordinates(value: string | undefined): GeoPoint[] | undefined {
  if (!value?.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;

    const points: GeoPoint[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as GeoPoint).lat === "number" &&
        typeof (item as GeoPoint).lng === "number"
      ) {
        points.push({ lat: (item as GeoPoint).lat, lng: (item as GeoPoint).lng });
      } else if (
        Array.isArray(item) &&
        item.length >= 2 &&
        Number.isFinite(Number(item[0])) &&
        Number.isFinite(Number(item[1]))
      ) {
        // GeoJSON-compatible [longitude, latitude] tuples.
        points.push({ lng: Number(item[0]), lat: Number(item[1]) });
      } else {
        return undefined;
      }
    }

    if (points.length < 3) return undefined;
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) points.push({ ...first });
    return points;
  } catch {
    return undefined;
  }
}

function rectangleAround(center: GeoPoint, areaM2 = 1_600): GeoPoint[] {
  const sideMeters = Math.max(12, Math.sqrt(Math.max(areaM2, 144)));
  const halfLat = sideMeters / 2 / 111_320;
  const halfLng = sideMeters / 2 / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  const point = (lat: number, lng: number): GeoPoint => ({
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  });
  return [
    point(center.lat - halfLat, center.lng - halfLng),
    point(center.lat - halfLat, center.lng + halfLng),
    point(center.lat + halfLat, center.lng + halfLng),
    point(center.lat + halfLat, center.lng - halfLng),
    point(center.lat - halfLat, center.lng - halfLng),
  ];
}

function fallbackCenterForPnu(pnu: string): GeoPoint {
  let seedA = 17;
  let seedB = 31;
  for (const digit of pnu) {
    const value = Number(digit);
    seedA = (seedA * 33 + value) % 10_007;
    seedB = (seedB * 37 + value) % 10_009;
  }
  return {
    lat: Number((36.47 + (seedA % 2_700) / 10_000).toFixed(6)),
    lng: Number((127.14 + (seedB % 2_500) / 10_000).toFixed(6)),
  };
}

function deriveAdminArea(address: string | undefined): string | undefined {
  if (!address) return undefined;
  const parts = address.trim().split(/\s+/);
  if (parts.length < 3) return undefined;
  return parts.slice(1, -1).join(" ");
}

export function parsePnuCsv(text: string): PnuCsvParseResult {
  const matrix = parseCsvMatrix(text);
  const errors: CsvImportError[] = [];
  const rows: PnuCsvRow[] = [];
  if (!matrix.length) {
    return {
      rows,
      errors: [{ row: 1, message: "CSV 파일이 비어 있습니다." }],
    };
  }

  let headers = matrix[0];
  let dataStart = 1;
  let pnuColumn = findColumn(headers, "pnu");
  if (pnuColumn < 0 && /^['\t]?\d{19}$/.test(headers[0]?.trim() ?? "")) {
    headers = ["PNU"];
    dataStart = 0;
    pnuColumn = 0;
  }
  if (pnuColumn < 0) {
    return {
      rows,
      errors: [
        {
          row: 1,
          column: "PNU",
          message: "PNU, 필지고유번호 또는 고유번호 열을 찾을 수 없습니다.",
        },
      ],
    };
  }

  const columns = Object.fromEntries(
    (Object.keys(HEADER_ALIASES) as ColumnKey[]).map((key) => [
      key,
      key === "pnu" ? pnuColumn : findColumn(headers, key),
    ]),
  ) as Record<ColumnKey, number>;
  const seenPnus = new Set<string>();

  for (let matrixIndex = dataStart; matrixIndex < matrix.length; matrixIndex += 1) {
    const values = matrix[matrixIndex];
    const rowNumber = matrixIndex + 1;
    const valueAt = (key: ColumnKey): string | undefined => {
      const columnIndex = columns[key];
      return columnIndex >= 0 ? values[columnIndex]?.trim() : undefined;
    };
    const rawPnu = valueAt("pnu") ?? "";
    const pnu = cleanPnu(rawPnu);

    if (!/^\d{19}$/.test(pnu)) {
      errors.push({
        row: rowNumber,
        column: "PNU",
        value: rawPnu,
        message: /e\+?/i.test(rawPnu)
          ? "지수 표기된 PNU는 원래 19자리 값을 복구할 수 없습니다. 셀 형식을 텍스트로 바꿔 주세요."
          : "PNU는 숫자 19자리여야 합니다.",
      });
      continue;
    }
    if (seenPnus.has(pnu)) {
      errors.push({
        row: rowNumber,
        column: "PNU",
        value: pnu,
        message: "CSV 안에서 중복된 PNU입니다.",
      });
      continue;
    }

    const areaM2 = parseNumber(valueAt("areaM2"));
    const farmAreaM2 = parseNumber(valueAt("farmAreaM2"));
    const overlapRate = parseNumber(valueAt("overlapRate"));
    const riskScore = parseNumber(valueAt("riskScore"));
    const latitude = parseNumber(valueAt("latitude"));
    const longitude = parseNumber(valueAt("longitude"));
    let coordinates = parseCoordinates(valueAt("coordinates"));

    if (!coordinates && latitude !== undefined && longitude !== undefined) {
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        errors.push({
          row: rowNumber,
          column: "위도/경도",
          message: "위도 또는 경도의 범위가 올바르지 않아 좌표를 제외했습니다.",
        });
      } else {
        coordinates = rectangleAround({ lat: latitude, lng: longitude }, areaM2);
      }
    }

    seenPnus.add(pnu);
    rows.push({
      row: rowNumber,
      pnu,
      ...(valueAt("farmMapId") ? { farmMapId: valueAt("farmMapId") } : {}),
      ...(valueAt("address") ? { address: valueAt("address") } : {}),
      ...(valueAt("adminArea") ? { adminArea: valueAt("adminArea") } : {}),
      ...(areaM2 !== undefined ? { areaM2: Math.max(0, areaM2) } : {}),
      ...(farmAreaM2 !== undefined ? { farmAreaM2: Math.max(0, farmAreaM2) } : {}),
      ...(overlapRate !== undefined ? { overlapRate: clamp(overlapRate, 0, 100) } : {}),
      ...(parseCategory(valueAt("category"))
        ? { category: parseCategory(valueAt("category")) }
        : {}),
      ...(valueAt("crop") ? { crop: valueAt("crop") } : {}),
      ...(riskScore !== undefined ? { riskScore: clamp(riskScore, 0, 100) } : {}),
      ...(coordinates ? { coordinates } : {}),
    });
  }

  return { rows, errors };
}

export function pnuRowsToParcels(
  rows: readonly PnuCsvRow[],
  options: PnuCsvImportOptions = {},
): { parcels: NewParcelInput[]; skippedPnus: string[] } {
  const existingPnus = new Set(options.existingParcels?.map((parcel) => parcel.pnu) ?? []);
  const skippedPnus: string[] = [];
  const importedAt = new Date().toISOString();

  const parcels = rows.flatMap<NewParcelInput>((row) => {
    if (existingPnus.has(row.pnu)) {
      skippedPnus.push(row.pnu);
      return [];
    }
    existingPnus.add(row.pnu);
    const areaM2 = row.areaM2 ?? row.farmAreaM2 ?? 0;
    const farmAreaM2 = row.farmAreaM2 ?? areaM2;
    const hasSourceCoordinates = Boolean(row.coordinates?.length);
    const coordinates =
      row.coordinates ?? rectangleAround(fallbackCenterForPnu(row.pnu), areaM2 || 1_600);
    const address = row.address ?? `PNU ${row.pnu}`;
    const reasons = hasSourceCoordinates
      ? ["PNU CSV 신규 가져오기"]
      : ["PNU CSV 신규 가져오기", "원본 좌표 없음 — 경계 확인 필요"];

    return [
      {
        pnu: row.pnu,
        farmMapId: row.farmMapId ?? `FM-IMPORT-${row.pnu.slice(-8)}`,
        address,
        adminArea: row.adminArea ?? deriveAdminArea(row.address) ?? "행정구역 미확인",
        areaM2,
        farmAreaM2,
        overlapRate:
          row.overlapRate ?? (areaM2 > 0 ? clamp((farmAreaM2 / areaM2) * 100, 0, 100) : 0),
        category: row.category ?? "기타",
        crop: row.crop ?? "미상",
        stage: options.defaultAssigneeId ? "assignment" : "screening",
        status: options.defaultAssigneeId ? "assigned" : "pending",
        decision: "pending",
        riskScore: row.riskScore ?? 50,
        assigneeId: options.defaultAssigneeId ?? null,
        dueDate: options.defaultDueDate ?? null,
        coordinates,
        photoCount: 0,
        gpsVerified: false,
        reasons,
        notes: "",
        createdAt: importedAt,
        updatedAt: importedAt,
        ...(options.defaultAssigneeId ? { assignedAt: importedAt } : {}),
      },
    ];
  });

  return { parcels, skippedPnus };
}

export function importPnuCsv(
  text: string,
  options: PnuCsvImportOptions = {},
): PnuCsvImportResult {
  const parsed = parsePnuCsv(text);
  const converted = pnuRowsToParcels(parsed.rows, options);
  return { ...parsed, ...converted };
}

function protectSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = typeof value === "string" ? protectSpreadsheetCell(text) : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function exportParcelsToCsv(
  parcels: readonly Parcel[],
  investigators: readonly Investigator[] = [],
  includeBom = true,
): string {
  const investigatorNames = new Map(investigators.map((item) => [item.id, item.name]));
  const lines: string[] = [PARCEL_CSV_HEADERS.map(escapeCsvCell).join(",")];

  parcels.forEach((parcel) => {
    const coordinateJson = JSON.stringify(
      parcel.coordinates.map((point) => [point.lng, point.lat]),
    );
    const values = [
      // Leading apostrophe keeps all 19 PNU digits intact when opened in Excel.
      `'${parcel.pnu}`,
      parcel.farmMapId,
      parcel.address,
      parcel.adminArea,
      parcel.areaM2,
      parcel.farmAreaM2,
      parcel.overlapRate,
      parcel.category,
      parcel.crop,
      SURVEY_STAGE_LABELS[parcel.stage],
      SURVEY_STATUS_LABELS[parcel.status],
      SURVEY_DECISION_LABELS[parcel.decision],
      parcel.riskScore,
      parcel.assigneeId ? (investigatorNames.get(parcel.assigneeId) ?? parcel.assigneeId) : "",
      parcel.dueDate ?? "",
      parcel.photoCount,
      parcel.gpsVerified ? "예" : "아니오",
      parcel.reasons.join(" | "),
      parcel.notes,
      coordinateJson,
      parcel.updatedAt,
    ];
    lines.push(values.map(escapeCsvCell).join(","));
  });

  return `${includeBom ? "\uFEFF" : ""}${lines.join("\r\n")}`;
}

export function downloadParcelsCsv(
  parcels: readonly Parcel[],
  investigators: readonly Investigator[] = [],
  filename = `농지전수조사_${new Date().toISOString().slice(0, 10)}.csv`,
): void {
  if (typeof document === "undefined") {
    throw new Error("CSV 다운로드는 브라우저 환경에서만 사용할 수 있습니다.");
  }
  const blob = new Blob([exportParcelsToCsv(parcels, investigators)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
