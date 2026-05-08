/**
 * 지진 옥외대피소 CSV -> public_safety_address_cache 적재 스크립트.
 *
 * 사용 예:
 *   npx tsx scripts/import-earthquake-outdoor-shelter-csv.ts --file="/Users/name/Downloads/file.csv"
 *
 * 환경(.env.local):
 *   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - KAKAO_REST_API_KEY (주소 지오코딩)
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

config({ path: resolve(process.cwd(), ".env.local") });

const SOURCE_TYPE = "csv_earthquake_outdoor_shelter";
const SOURCE_NAME = "행정안전부 지진 옥외대피소(CSV)";
const CATEGORY = "earthquake_outdoor_shelter";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GEOCODE_CONCURRENCY = 5;

function parseArgs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    if (!a.startsWith("--")) continue;
    const body = a.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) out[body] = "true";
    else out[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }
    if (ch === "," && !inQuote) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells.map((v) => v.trim());
}

type CsvShelterRow = {
  sourceRecordKey: string;
  name: string;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  roadName: string | null;
  addrMainNo: string | null;
  addrSubNo: string | null;
};

function parseCsvRows(content: string): CsvShelterRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) return [];

  const header = parseCsvLine(lines[0]);
  const idx = (key: string) => header.indexOf(key);

  const iMngNo = idx("THINGS_MNG_NO");
  const iName = idx("THINGS_NM");
  const iSido = idx("CTPV_NM");
  const iSigungu = idx("SGG_NM");
  const iEmd = idx("EMD_NM");
  const iRoad = idx("ROAD_NM");
  const iMno = idx("ADDR_MNO");
  const iSno = idx("ADDR_SNO");

  const out: CsvShelterRow[] = [];
  for (let i = 2; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const sourceRecordKey =
      (iMngNo >= 0 ? cells[iMngNo] : "") || `csv:${i - 1}`;
    const name = (iName >= 0 ? cells[iName] : "") || "지진 옥외대피소";
    const sido = (iSido >= 0 ? cells[iSido] : "") || null;
    const sigungu = (iSigungu >= 0 ? cells[iSigungu] : "") || null;
    const eupmyeondong = (iEmd >= 0 ? cells[iEmd] : "") || null;
    const roadName = (iRoad >= 0 ? cells[iRoad] : "") || null;
    const addrMainNo = (iMno >= 0 ? cells[iMno] : "") || null;
    const addrSubNo = (iSno >= 0 ? cells[iSno] : "") || null;

    out.push({
      sourceRecordKey,
      name,
      sido,
      sigungu,
      eupmyeondong,
      roadName,
      addrMainNo,
      addrSubNo,
    });
  }
  return out;
}

function toAddress(r: CsvShelterRow): string {
  const base = [r.sido, r.sigungu, r.eupmyeondong, r.roadName]
    .filter((s) => s && s.trim())
    .join(" ");
  const no = [r.addrMainNo, r.addrSubNo]
    .map((s) => (s ?? "").trim())
    .filter((s) => s && s !== "0")
    .join("-");
  return [base, no].filter(Boolean).join(" ").trim() || r.name;
}

async function main() {
  const args = parseArgs();
  const filePath = args.file?.trim();
  if (!filePath) {
    console.error("usage: --file=/absolute/path/to.csv");
    process.exit(1);
  }

  const [{ batchGeocodeAddresses }, { getSupabaseAdminClient }] =
    await Promise.all([
      import("../lib/kakao/geocodeAddress.ts"),
      import("../lib/supabase/admin.ts"),
    ]);

  const raw = await readFile(filePath, "utf8");
  const parsed = parseCsvRows(raw);
  if (parsed.length === 0) {
    console.error("CSV 데이터가 비어있거나 헤더를 읽지 못했습니다.");
    process.exit(1);
  }

  const addresses = parsed.map((r) => toAddress(r));
  const geocoded = await batchGeocodeAddresses(addresses, GEOCODE_CONCURRENCY);

  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_MS);

  const rows = parsed.map((r, i) => {
    const g = geocoded[i] ?? null;
    const address = addresses[i];
    return {
      source_type: SOURCE_TYPE,
      source_name: SOURCE_NAME,
      source_record_key: r.sourceRecordKey,
      category: CATEGORY,
      display_address: `${r.name} (${address})`,
      address_for_geocoding: address,
      sido: r.sido,
      sigungu: r.sigungu,
      eupmyeondong: r.eupmyeondong,
      ri: null,
      latitude: g?.latitude ?? null,
      longitude: g?.longitude ?? null,
      fetched_at: fetchedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    };
  });

  const supabase = getSupabaseAdminClient();
  const keys = rows.map((r) => r.source_record_key);

  const { data: existing, error: selErr } = await supabase
    .from("public_safety_address_cache")
    .select("source_record_key")
    .eq("source_type", SOURCE_TYPE)
    .in("source_record_key", keys);
  if (selErr) throw new Error(`select existing failed: ${selErr.message}`);

  const existingSet = new Set(
    (existing ?? []).map((r) => r.source_record_key as string)
  );
  const insertRows = rows.filter((r) => !existingSet.has(r.source_record_key));
  const updateRows = rows.filter((r) => existingSet.has(r.source_record_key));

  let inserted = 0;
  if (insertRows.length > 0) {
    const { data: insData, error: insErr } = await supabase
      .from("public_safety_address_cache")
      .insert(insertRows)
      .select("id");
    if (insErr) throw new Error(`insert failed: ${insErr.message}`);
    inserted = insData?.length ?? 0;
  }

  let updated = 0;
  for (const r of updateRows) {
    const { error: updErr } = await supabase
      .from("public_safety_address_cache")
      .update({
        display_address: r.display_address,
        address_for_geocoding: r.address_for_geocoding,
        sido: r.sido,
        sigungu: r.sigungu,
        eupmyeondong: r.eupmyeondong,
        latitude: r.latitude,
        longitude: r.longitude,
        fetched_at: r.fetched_at,
        expires_at: r.expires_at,
      })
      .eq("source_type", SOURCE_TYPE)
      .eq("source_record_key", r.source_record_key);
    if (updErr) throw new Error(`update failed: ${updErr.message}`);
    updated += 1;
  }

  const withCoords = rows.filter(
    (r) => r.latitude != null && r.longitude != null
  ).length;

  console.log("\n=== summary ===");
  console.log(
    JSON.stringify(
      {
        filePath,
        fetched: rows.length,
        upserted: inserted + updated,
        withCoords,
        geocodeFailed: rows.length - withCoords,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
