/**
 * 공공안전(성범죄자 공개·고지 주소) 캐시 수동 동기화 스크립트.
 *
 * 사용 예:
 *   npx tsx scripts/sync-public-safety.ts --pageNo=1 --numOfRows=100
 *   npx tsx scripts/sync-public-safety.ts --pages=5 --numOfRows=100   # 1..5 페이지 순차 수집
 *
 * 환경: .env.local 에 GOV24_API_KEY, KAKAO_REST_API_KEY,
 *       NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필수.
 */

import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

// 값(런타임 상수)을 캡쳐하는 모듈은 ESM hoisting 회피를 위해 main 내부에서 동적 import.
import type { NormalizedSexOffenderAddressItem } from "../lib/public-safety/gov24SexOffenderAddress";

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

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

async function main() {
  const [
    {
      fetchGov24SexOffenderAddressesRaw,
      normalizeSexOffenderAddressItem,
      parseGov24SaisResponse,
    },
    { batchGeocodeAddresses },
    { getSupabaseAdminClient },
  ] = await Promise.all([
    import("../lib/public-safety/gov24SexOffenderAddress.ts"),
    import("../lib/kakao/geocodeAddress.ts"),
    import("../lib/supabase/admin.ts"),
  ]);

  const args = parseArgs();
  const serviceKey = process.env.GOV24_API_KEY?.trim();
  if (!serviceKey) {
    console.error("GOV24_API_KEY 가 설정되지 않았습니다 (.env.local).");
    process.exit(1);
  }

  const numOfRows = Math.min(toPositiveInt(args.numOfRows, 100), 100);
  const pages = toPositiveInt(args.pages, 0);
  const pageNo = toPositiveInt(args.pageNo, 1);

  const startPage = pages > 0 ? 1 : pageNo;
  const endPage = pages > 0 ? pages : pageNo;

  const supabase = getSupabaseAdminClient();

  let totals = {
    fetched: 0,
    upserted: 0,
    geocodeFailed: 0,
    skipped: 0,
    totalCount: 0,
  };

  for (let p = startPage; p <= endPage; p += 1) {
    process.stdout.write(`page ${p} (numOfRows=${numOfRows}) ... `);
    try {
      const raw = await fetchGov24SexOffenderAddressesRaw({
        serviceKey,
        pageNo: p,
        numOfRows,
      });
      if (raw.status < 200 || raw.status >= 300) {
        throw new Error(`gov24 status ${raw.status}`);
      }
      const parsed = parseGov24SaisResponse(raw.json);
      const code = parsed.headerResultCode;
      if (code && code !== "0" && code !== "00") {
        throw new Error(
          `gov24 header ${code} ${parsed.headerResultMsg ?? ""}`
        );
      }

      const normalized = parsed.items.map((rawItem, index) =>
        normalizeSexOffenderAddressItem(rawItem, p, index)
      );

      const usable: NormalizedSexOffenderAddressItem[] = [];
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
          `fetched=${parsed.items.length} upserted=0 geocodeFailed=0 skipped=${skipped} (total=${parsed.totalCount})`
        );
        totals.fetched += parsed.items.length;
        totals.skipped += skipped;
        totals.totalCount = parsed.totalCount;
        if (parsed.items.length === 0) break;
        continue;
      }

      const addresses = usable.map((u) => u.addressForGeocoding);
      const geocoded = await batchGeocodeAddresses(
        addresses,
        GEOCODE_CONCURRENCY
      );

      let geocodeFailed = 0;
      const fetchedAt = new Date();
      const expiresAt = new Date(
        fetchedAt.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      const rows = usable.map((u, idx) => {
        const coords = geocoded[idx];
        if (!coords) geocodeFailed += 1;
        return {
          source_type: u.sourceType,
          source_name: u.sourceName,
          source_record_key: u.id,
          category: "sex_offender_notice_address",
          display_address: u.displayAddress,
          address_for_geocoding: u.addressForGeocoding,
          sido: u.sido,
          sigungu: u.sigungu,
          eupmyeondong: u.eupmyeondong,
          ri: u.ri,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          fetched_at: fetchedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        };
      });

      // 정부 응답 자체에 동일 source_record_key 중복이 섞여 들어올 수 있어
      // 배치 안에서 먼저 dedup. (같은 동·본번·부번·작성일이면 동일 hash → 동일 ID)
      {
        const seenInBatch = new Set<string>();
        const deduped: typeof rows = [];
        for (const r of rows) {
          if (seenInBatch.has(r.source_record_key)) continue;
          seenInBatch.add(r.source_record_key);
          deduped.push(r);
        }
        if (deduped.length !== rows.length) {
          process.stdout.write(
            `[dedup ${rows.length - deduped.length} 건] `
          );
        }
        rows.length = 0;
        rows.push(...deduped);
      }

      // partial unique index 라서 .upsert 의 onConflict 가 매칭되지 않는다.
      // 회피: 기존 source_record_key 들을 한 번 SELECT 한 뒤
      //   - 새 것은 INSERT (배치)
      //   - 기존 것은 좌표/타임스탬프만 UPDATE (행 단위)
      const keys = rows
        .map((r) => r.source_record_key)
        .filter((k): k is string => typeof k === "string" && k.length > 0);

      const { data: existingRows, error: selErr } = await supabase
        .from("public_safety_address_cache")
        .select("source_record_key")
        .eq("source_type", "gov24_openapi")
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
      totals.geocodeFailed += geocodeFailed;
      totals.skipped += skipped;
      totals.totalCount = parsed.totalCount;
      console.log(
        `fetched=${parsed.items.length} upserted=${upserted} geocodeFailed=${geocodeFailed} skipped=${skipped} (total=${parsed.totalCount})`
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
