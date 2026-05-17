import type { AccidentAddress } from "@/types";

const DEFAULT_UA =
  "AccidentsBank/1.0 (https://github.com; contact: dev@localhost)";

function userAgent(): string {
  return process.env.NOMINATIM_USER_AGENT?.trim() || DEFAULT_UA;
}

export interface OsmSearchHit {
  id: string;
  name: string;
  lat: number;
  lng: number;
  roadAddress?: string;
  address?: string;
  category?: string;
}

/** Nominatim reverse — [Usage policy](https://operations.osmfoundation.org/policies/nominatim/) 준수: 캐시·적당한 요청 빈도 */
export async function nominatimReverse(
  lat: number,
  lng: number
): Promise<AccidentAddress | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": userAgent() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const a = j.address ?? {};
  const road =
    [a.road, a.suburb, a.city, a.town, a.village].filter(Boolean).join(", ") ||
    j.display_name;
  return {
    roadAddress: j.display_name ?? road,
    jibunAddress: undefined,
    region1: a.country,
    region2: a.state ?? a.province,
    region3: a.city ?? a.town ?? a.village ?? a.suburb,
  };
}

export async function nominatimSearch(
  q: string,
  limit = 10
): Promise<OsmSearchHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": userAgent() },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const arr = (await res.json()) as Array<{
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    type?: string;
    class?: string;
  }>;
  return arr
    .map((row, idx) => ({
      id: `osm-${row.place_id}-${idx}`,
      name:
        row.name ||
        row.display_name.split(",")[0]?.trim() ||
        row.display_name,
      lat: Number(row.lat),
      lng: Number(row.lon),
      roadAddress: row.display_name,
      category: row.class ? `${row.class}/${row.type ?? ""}` : undefined,
    }))
    .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng));
}
