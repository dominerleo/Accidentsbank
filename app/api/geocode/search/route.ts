import { NextResponse } from "next/server";
import { nominatimSearch } from "@/lib/osm/nominatim";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 10, 1),
    15
  );
  const places = await nominatimSearch(q, limit);
  return NextResponse.json({ places, totalCount: places.length });
}
