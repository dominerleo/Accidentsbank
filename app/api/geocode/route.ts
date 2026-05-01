import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/kakao/address";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat, lng query params are required" },
      { status: 400 }
    );
  }

  const address = await reverseGeocode({ lat, lng });
  if (!address) {
    return NextResponse.json({ error: "no address found" }, { status: 404 });
  }

  return NextResponse.json(address);
}
