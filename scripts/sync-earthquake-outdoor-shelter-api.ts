/**
 * 지진 옥외대피소(safetydata.go.kr DSSP-IF-00103) 캐시 수동 동기화.
 *
 * 사용 예:
 *   npx tsx scripts/sync-earthquake-outdoor-shelter-api.ts --pages=5 --numOfRows=200
 *
 * 환경(.env.local):
 *   - SAFETYDATA_API_KEY                         (필수)
 *   - SAFETYDATA_EARTHQUAKE_SHELTER_API_URL      (선택 — 기본 DSSP-IF-00103)
 *   - KAKAO_REST_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

import type { NormalizedTsunamiEvacuationItem } from "../lib/disasters/safetydataTsunamiEvacuation";

const GEOCODE_CONCURRENCY = 5;
const EQ_CATEGORY = "earthquake_outdoor_shelter";
const SOURCE_TYPE_FILTER = "safetydata_earthquake_outdoor_shelter";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

async function main() {
  const [
    {
      fetchEarthquakeOutdoorShelterRaw,
      normalizeEarthquakeOutdoorShelterItem,
      parseTsunamiResponse,
    },
    { batchGeocodeAddresses },
    { getSupabaseAdminClient },
  ] = await Promise.all([
    import("../lib/disasters/safetydataEarthquakeOutdoorShelter.ts"),
    import("../lib/kakao/geocodeAddress.ts"),
    import("../lib/supabase/admin.ts"),
  ]);

  const args = parseArgs();
  const serviceKey = process.env.SAFETYDATA_API_KEY?.trim();
  if (!serviceKey) {
    console.error("SAFETYDATA_API_KEY 가 설정되지 않았습니다 (.env.local).");
    process.exit(1);
  }

  const numOfRows = Math.min(toPositiveInt(args.numOfRows, 200), 200);
  const pages = toPositiveInt(args.pages, 0);
  const pageNo = toPositiveInt(args.pageNo, 1);

  const startPage = pages > 0 ? 1 : pageNo;
  const endPage = pages > 0 ? pages : pageNo;

  const supabase = getSupabaseAdminClient();

  const totals = {
    fetched: 0,
    upserted: 0,
    hadCoords: 0,
    geocodeFailed: 0,
    skipped: 0,
    totalCount: 0,
  };

  for (let p = startPage; p <= endPage; p += 1) {
    process.stdout.write(`page ${p} (numOfRows=${numOfRows}) ... `);
    try {
      const raw = await fetchEarthquakeOutdoorShelterRaw({
        serviceKey,
        pageNo: p,
        numOfRows,
      });
      if (raw.status < 200 || raw.status >= 300) {
        throw new Error(`safetydata status ${raw.status}`);
      }
      const parsed = parseTsunamiResponse(raw.json);
      const code = parsed.headerResultCode;
      if (code && code !== "0" && code !== "00") {
        throw new Error(
          `safetydata header ${code} ${parsed.headerResultMsg ?? ""}`
        );
      }

      const normalized = parsed.items.map((rawItem, index) =>
        normalizeEarthquakeOutdoorShelterItem(rawItem, p, index)
      );

      const usable: NormalizedTsunamiEvacuationItem[] = [];
      let skipped = 0;
      for (const n of normalized) {
        if (
          !n.addressForGeocoding ||
          n.addressForGeocoding === "(주소 요약 없음)"
        ) {
          skipped += 1;
          continue;
        }
        usable.push(n);
      }

      if (usable.length === 0) {
        console.log(
          `fetched=${parsed.items.length} upserted=0 hadCoords=0 geocodeFailed=0 skipped=${skipped} (total=${parsed.totalCount})`
        );
        totals.fetched += parsed.items.length;
        totals.skipped += skipped;
        totals.totalCount = parsed.totalCount;
        if (parsed.items.length === 0) break;
        continue;
      }

      const needGeocodeIdx: number[] = [];
      const needGeocodeAddr: string[] = [];
      for (let i = 0; i < usable.length; i += 1) {
        const u = usable[i];
        if (u.latitude == null || u.longitude == null) {
          needGeocodeIdx.push(i);
          needGeocodeAddr.push(u.addressForGeocoding);
        }
      }
      const geocoded = await batchGeocodeAddresses(
        needGeocodeAddr,
        GEOCODE_CONCURRENCY
      );

      let hadCoords = 0;
      let geocodeFailed = 0;
      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_MS);

      const rows = usable.map((u, i) => {
        const localIdx = needGeocodeIdx.indexOf(i);
        const coords = localIdx === -1 ? null : geocoded[localIdx] ?? null;
        let lat: number | null;
        let lng: number | null;
        if (u.latitude != null && u.longitude != null) {
          lat = u.latitude;
          lng = u.longitude;
          hadCoords += 1;
        } else if (coords) {
          lat = coords.latitude;
          lng = coords.longitude;
        } else {
          lat = null;
          lng = null;
          geocodeFailed += 1;
        }
        const display =
          u.name && u.name.trim()
            ? `${u.name.trim()} (${u.displayAddress})`
            : u.displayAddress;
        return {
          source_type: u.sourceType,
          source_name: u.sourceName,
          source_record_key: u.id,
          category: EQ_CATEGORY,
          display_address: display,
          address_for_geocoding: u.addressForGeocoding,
          sido: u.sido,
          sigungu: u.sigungu,
          eupmyeondong: u.eupmyeondong,
          ri: u.ri,
          latitude: lat,
          longitude: lng,
          fetched_at: fetchedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        };
      });

      {
        const seen = new Set<string>();
        const deduped: typeof rows = [];
        for (const r of rows) {
          if (seen.has(r.source_record_key)) continue;
          seen.add(r.source_record_key);
          deduped.push(r);
        }
        if (deduped.length !== rows.length) {
          process.stdout.write(`[dedup ${rows.length - deduped.length} 건] `);
        }
        rows.length = 0;
        rows.push(...deduped);
      }

      const keys = rows
        .map((r) => r.source_record_key)
        .filter((k): k is string => typeof k === "string" && k.length > 0);

      const { data: existingRows, error: selErr } = await supabase
        .from("public_safety_address_cache")
        .select("source_record_key")
        .eq("source_type", SOURCE_TYPE_FILTER)
        .in("source_record_key", keys);
      if (selErr) throw new Error(`select existing failed: ${selErr.message}`);

      const existingSet = new Set(
        (existingRows ?? []).map((r) => r.source_record_key as string)
      );

      const insertRows = rows.filter(
        (r) => !existingSet.has(r.source_record_key)
      );
      const updateRows = rows.filter((r) =>
        existingSet.has(r.source_record_key)
      );

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
            ri: r.ri,
            latitude: r.latitude,
            longitude: r.longitude,
            fetched_at: r.fetched_at,
            expires_at: r.expires_at,
          })
          .eq("source_type", r.source_type)
          .eq("source_record_key", r.source_record_key);
        if (updErr) throw new Error(`update failed: ${updErr.message}`);
        updated += 1;
      }

      const upserted = inserted + updated;
      totals.fetched += parsed.items.length;
      totals.upserted += upserted;
      totals.hadCoords += hadCoords;
      totals.geocodeFailed += geocodeFailed;
      totals.skipped += skipped;
      totals.totalCount = parsed.totalCount;

      console.log(
        `fetched=${parsed.items.length} upserted=${upserted} hadCoords=${hadCoords} geocodeFailed=${geocodeFailed} skipped=${skipped} (total=${parsed.totalCount})`
      );

      if (parsed.items.length === 0) break;
    } catch (e) {
      console.error("FAIL:", e instanceof Error ? e.message : String(e));
      break;
    }
  }

  console.log("\n=== summary ===");
  console.log(JSON.stringify(totals, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
