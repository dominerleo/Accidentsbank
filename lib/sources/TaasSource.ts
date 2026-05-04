import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AccidentSource, NormalizedAccident, SourceQuery } from "./types";
import { parseOfficialAccidentsCsv } from "./officialCsv";

/**
 * TAAS·공공 CSV 등 공식 좌표 포함 데이터 어댑터.
 *
 * `SourceQuery.dataFilePath` 에 프로젝트 루트 기준 상대 또는 절대 CSV 경로를 넣고
 * `scripts/import-batch.ts --source=official --csv=...` 로 적재합니다.
 */
export class TaasSource implements AccidentSource {
  readonly type = "official";
  readonly label = "공식 통계 (TAAS/CSV)";
  readonly enabled = true;

  async fetch(query: SourceQuery): Promise<NormalizedAccident[]> {
    const rel = query.dataFilePath?.trim();
    if (!rel) return [];

    const path = resolve(process.cwd(), rel);
    const text = readFileSync(path, "utf-8");
    return parseOfficialAccidentsCsv(text);
  }
}
