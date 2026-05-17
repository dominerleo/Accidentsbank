import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SeoulGuDistrict {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

export interface SeoulGuCentroidFile {
  version: string;
  scope: string;
  crs: string;
  districts: SeoulGuDistrict[];
}

let cache: SeoulGuCentroidFile | null = null;

export function loadSeoulGuCentroids(): SeoulGuCentroidFile {
  if (cache) return cache;
  const path = join(process.cwd(), "data/seoul/seoul-gu-centroids.json");
  const raw = readFileSync(path, "utf-8");
  cache = JSON.parse(raw) as SeoulGuCentroidFile;
  return cache;
}

/** "강남구" "서울특별시 강남구" "11680" 등 매칭 */
export function findSeoulGuDistrict(
  nameOrCode: string,
  data: SeoulGuCentroidFile = loadSeoulGuCentroids()
): SeoulGuDistrict | null {
  const s = nameOrCode.trim().replace(/\s+/g, "");
  if (!s) return null;

  const byCode = data.districts.find((d) => d.code === s);
  if (byCode) return byCode;

  const compact = s.replace(/^서울특별시/, "");
  const byName = data.districts.find(
    (d) =>
      compact === d.name ||
      compact.endsWith(d.name) ||
      d.name.replace("구", "") === compact.replace("구", "")
  );
  return byName ?? null;
}
