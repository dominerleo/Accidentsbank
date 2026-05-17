/**
 * 배치 적재: 뉴스(네이버) 또는 공공 CSV → Supabase accidents upsert
 *
 * 사용 예:
 *   npm run import:batch -- --source=news --keyword=교통사고 --region=서울 --limit=10
 *   npm run import:batch -- --source=official --csv=docs/sample-official.csv
 *   npm run import:batch -- --source=official --csv=docs/sample-seoul-aggregate.csv
 *
 * CSV 스펙·집계 모드: docs/csv-official-spec.md
 * 적재 순서: docs/ingest-pipeline-order.md
 *
 * 환경: .env.local 에 SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *       뉴스는 NAVER_CLIENT_ID/SECRET + KAKAO_REST_API_KEY 필수.
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import type { SourceQuery } from "@/lib/sources/types";

config({ path: resolve(process.cwd(), ".env.local") });
if (process.env.IMPORT_FORCE_NEWS === undefined) {
  process.env.IMPORT_FORCE_NEWS = "1";
}

function parseArgs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    if (!a.startsWith("--")) continue;
    const body = a.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) {
      out[body] = "true";
    } else {
      out[body.slice(0, eq)] = body.slice(eq + 1);
    }
  }
  return out;
}

async function main() {
  const [{ getSourceByType }, { getSupabaseAdminClient }, batch] =
    await Promise.all([
      import("@/lib/sources"),
      import("@/lib/supabase/admin"),
      import("@/lib/import/batchUpsert"),
    ]);

  const args = parseArgs();
  const source = args.source ?? "news";
  const src = getSourceByType(source);
  if (!src) {
    console.error(`알 수 없는 --source=${source} (news | official)`);
    process.exit(1);
  }
  if (!src.enabled) {
    console.error(
      "소스가 비활성입니다. 뉴스는 FEATURE_NEWS_SEARCH=true 또는 IMPORT_FORCE_NEWS=1"
    );
    process.exit(1);
  }

  const query: SourceQuery = {
    keyword: args.keyword,
    region: args.region,
    limit: args.limit ? Number(args.limit) : 15,
    fromYear: args["from-year"] ? Number(args["from-year"]) : undefined,
    toYear: args["to-year"] ? Number(args["to-year"]) : undefined,
    dataFilePath: args.csv,
  };

  if (source === "news" && !(query.keyword ?? "").trim()) {
    console.error("뉴스 소스는 --keyword= 가 필요합니다.");
    process.exit(1);
  }
  if (source === "official" && !(query.dataFilePath ?? "").trim()) {
    console.error("official 소스는 --csv= 프로젝트 기준 상대 경로가 필요합니다.");
    process.exit(1);
  }

  const items = await src.fetch(query);
  console.log(`정규화 ${items.length}건 (source=${source})`);

  if (!items.length) {
    process.exit(0);
  }

  const admin = getSupabaseAdminClient();
  const rows = items.map((n, idx) =>
    batch.normalizedAccidentToDbRow(
      n,
      batch.externalIdForNormalized(
        n,
        `${n.sourceType}:fallback:${idx}:${n.title.slice(0, 40)}`
      )
    )
  );

  const batchSize = args.batch ? Number(args.batch) : 40;
  const { upserted, errors } = await batch.upsertAccidentBatch(
    admin,
    rows,
    batchSize
  );
  console.log(`upsert 완료: ${upserted}행`);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
