import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/kakao/address";
import { nominatimReverse } from "@/lib/osm/nominatim";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const source = searchParams.get("source");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat, lng query params are required" },
      { status: 400 }
    );
  }

  if (source === "osm") {
    const address = await nominatimReverse(lat, lng);
    if (!address?.roadAddress) {
      return NextResponse.json({ error: "no address found" }, { status: 404 });
    }
    return NextResponse.json(address);
  }

  const address = await reverseGeocode({ lat, lng });
  if (!address) {
    return NextResponse.json({ error: "no address found" }, { status: 404 });
  }

  return NextResponse.json(address);
}
