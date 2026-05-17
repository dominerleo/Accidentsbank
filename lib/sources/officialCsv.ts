import type { NormalizedAccident } from "@/lib/sources/types";
import type { AccidentCategory } from "@/types";
import { normalizeAccidentCategory } from "@/types";
import { findSeoulGuDistrict, loadSeoulGuCentroids } from "@/lib/data/seoulGuCentroids";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function colIndex(header: string[], ...names: string[]): number {
  const lower = header.map((h) => h.toLowerCase().replace(/\s/g, ""));
  for (const name of names) {
    const n = name.toLowerCase().replace(/\s/g, "");
    const i = lower.findIndex((h) => h === n || h.endsWith(n));
    if (i >= 0) return i;
  }
  return -1;
}

function slugPart(s: string, max = 80): string {
  return s
    .trim()
    .slice(0, max)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9가-힣_\-]/g, "");
}

/**
 * 모드 A — 사건별 점 (lat/lng 필수)
 * 헤더: lat, lng (또는 latitude/longitude), occurred_at, title, category,
 *       선택 description, external_id
 */
function parsePointRows(
  lines: string[],
  header: string[]
): NormalizedAccident[] {
  const latI = colIndex(header, "lat", "latitude");
  const lngI = colIndex(header, "lng", "lon", "longitude", "long");
  const titleI = colIndex(header, "title");
  const catI = colIndex(header, "category");
  const timeI = colIndex(header, "occurred_at", "occurredat", "date", "datetime");
  const descI = colIndex(header, "description", "desc");
  const extI = colIndex(header, "external_id", "externalid", "id");

  if (latI < 0 || lngI < 0 || titleI < 0 || catI < 0 || timeI < 0) {
    throw new Error(
      "점 모드: 헤더에 lat, lng, title, category, occurred_at(또는 date) 가 필요합니다."
    );
  }

  const out: NormalizedAccident[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]).map((c) => c.replace(/^"|"$/g, ""));
    const lat = Number(cells[latI]);
    const lng = Number(cells[lngI]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const title = cells[titleI]?.trim();
    if (!title) continue;

    const rawCat = (cells[catI] ?? "incident").trim().toLowerCase();
    const category = normalizeAccidentCategory(rawCat) as AccidentCategory;

    const timeRaw = cells[timeI]?.trim();
    const occurredAt = timeRaw
      ? new Date(timeRaw).toISOString()
      : new Date().toISOString();
    if (Number.isNaN(new Date(occurredAt).getTime())) continue;

    const description =
      descI >= 0 ? cells[descI]?.trim() || undefined : undefined;
    const ext =
      extI >= 0 && cells[extI]?.trim()
        ? cells[extI].trim()
        : `csv:point:${r}:${title.slice(0, 80)}`;

    out.push({
      category,
      title: title.slice(0, 500),
      description,
      occurredAt,
      location: { lat, lng },
      address: {},
      sourceType: "official",
      metadata: {
        external_id: ext,
        import_row: r,
        csv_mode: "point",
      },
      confidence: 0.85,
      tags: ["official-csv"],
    });
  }

  return out;
}

/**
 * 모드 B — 시군구 집계 (lat/lng 생략, 서울 자치구 centroid 사용)
 * 헤더: year, value, metric, category + (gu_code | gu_name),
 *       선택 occurred_at, description, external_id, source_url
 */
function parseAggregateRows(
  lines: string[],
  header: string[]
): NormalizedAccident[] {
  const guCodeI = colIndex(header, "gu_code", "code", "sigungu_code");
  const guNameI = colIndex(header, "gu_name", "gu", "district", "sigungu");
  const yearI = colIndex(header, "year", "yyyy", "yr");
  const valueI = colIndex(header, "value", "count", "cnt", "cases");
  const metricI = colIndex(header, "metric", "indicator", "지표");
  const catI = colIndex(header, "category");
  const timeI = colIndex(header, "occurred_at", "occurredat", "date", "asof");
  const descI = colIndex(header, "description", "desc");
  const extI = colIndex(header, "external_id", "externalid", "id");
  const urlI = colIndex(header, "source_url", "url", "link");

  if (yearI < 0 || valueI < 0 || metricI < 0 || catI < 0) {
    throw new Error(
      "집계 모드: year, value, metric, category 컬럼이 필요합니다."
    );
  }
  if (guCodeI < 0 && guNameI < 0) {
    throw new Error("집계 모드: gu_code 또는 gu_name 중 하나가 필요합니다.");
  }

  const centroidFile = loadSeoulGuCentroids();
  const out: NormalizedAccident[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]).map((c) => c.replace(/^"|"$/g, ""));
    const yearStr = cells[yearI]?.trim();
    const year = Number(yearStr);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) continue;

    const value = Number(cells[valueI]);
    if (!Number.isFinite(value)) continue;

    const metric = cells[metricI]?.trim();
    if (!metric) continue;

    const rawCat = (cells[catI] ?? "incident").trim().toLowerCase();
    const category = normalizeAccidentCategory(rawCat) as AccidentCategory;

    const guKey =
      guCodeI >= 0 && cells[guCodeI]?.trim()
        ? cells[guCodeI].trim()
        : (guNameI >= 0 ? cells[guNameI]?.trim() ?? "" : "");
    const gu = findSeoulGuDistrict(guKey, centroidFile);
    if (!gu) continue;

    const timeRaw = timeI >= 0 ? cells[timeI]?.trim() : "";
    const occurredAt = timeRaw
      ? new Date(timeRaw).toISOString()
      : `${year}-07-01T00:00:00.000Z`;
    if (Number.isNaN(new Date(occurredAt).getTime())) continue;

    const description =
      descI >= 0 ? cells[descI]?.trim() || undefined : undefined;
    const sourceUrl = urlI >= 0 ? cells[urlI]?.trim() || undefined : undefined;

    const title = `「${year} 서울 ${gu.name} ${metric}」집계 ${value}건`;
    const extDefault = `agg:${year}:${gu.code}:${slugPart(metric, 60)}`;
    const ext =
      extI >= 0 && cells[extI]?.trim() ? cells[extI].trim() : extDefault;

    out.push({
      category,
      title: title.slice(0, 500),
      description,
      occurredAt,
      location: { lat: gu.lat, lng: gu.lng },
      address: {
        region1: "서울특별시",
        region2: gu.name,
      },
      sourceType: "official",
      metadata: {
        external_id: ext.slice(0, 2000),
        import_row: r,
        csv_mode: "aggregate",
        aggregate: true,
        year,
        value,
        metric,
        gu_code: gu.code,
        gu_name: gu.name,
        centroid_version: centroidFile.version,
        source_url: sourceUrl,
      },
      confidence: 0.62,
      tags: ["official-csv", "seoul-aggregate"],
    });
  }

  return out;
}

/**
 * 공공·내부 배치용 CSV.
 *
 * - **점 모드**: `lat` + `lng` 컬럼이 있으면 사건별 좌표 행으로 파싱.
 * - **집계 모드**: `lat`/`lng` 없이 `year`+`value`+`metric`+`category`+`gu_name|gu_code` 로 파싱하고
 *   [data/seoul/seoul-gu-centroids.json](data/seoul/seoul-gu-centroids.json) 의 구 중심에 점을 둡니다.
 */
export function parseOfficialAccidentsCsv(text: string): NormalizedAccident[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));

  const latI = colIndex(header, "lat", "latitude");
  const lngI = colIndex(header, "lng", "lon", "longitude", "long");
  const yearI = colIndex(header, "year", "yyyy", "yr");
  const valueI = colIndex(header, "value", "count", "cnt", "cases");
  const metricI = colIndex(header, "metric", "indicator", "지표");
  const guNameI = colIndex(header, "gu_name", "gu", "district", "sigungu");
  const guCodeI = colIndex(header, "gu_code", "code", "sigungu_code");

  const hasPointCols = latI >= 0 && lngI >= 0;
  const hasAggregateCols =
    yearI >= 0 &&
    valueI >= 0 &&
    metricI >= 0 &&
    (guNameI >= 0 || guCodeI >= 0);

  if (hasPointCols) {
    return parsePointRows(lines, header);
  }
  if (hasAggregateCols) {
    return parseAggregateRows(lines, header);
  }

  throw new Error(
    "CSV 형식을 알 수 없습니다. 점 모드(lat,lng,...) 또는 집계 모드(year,value,metric,gu_name|gu_code,...) 를 사용하세요."
  );
}
