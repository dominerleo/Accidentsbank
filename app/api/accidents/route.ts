import { NextResponse } from "next/server";
import type { AccidentInput } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  inputToInsertRow,
  rowToAccident,
  type AccidentRow,
} from "@/lib/supabase/accident";

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

function parseFloatOrNull(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseListParam(v: string | null): string[] | null {
  if (!v) return null;
  const arr = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

/**
 * GET /api/accidents
 *   ?bbox=minLat,minLng,maxLat,maxLng  (선택, 없으면 전체)
 *   &category=traffic,crime
 *   &source=user,news
 *   &from=2020-01-01&to=2025-12-31
 *   &limit=1000
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const bboxRaw = searchParams.get("bbox");
  const category = parseListParam(searchParams.get("category"));
  const source = parseListParam(searchParams.get("source"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  // GET 은 RLS 가 모두 SELECT 허용이므로 익명(anon)으로도 충분.
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  // bbox 가 주어지면 PostGIS 공간 함수 사용, 아니면 단순 select.
  if (bboxRaw) {
    const parts = bboxRaw.split(",").map(parseFloatOrNull);
    if (parts.length !== 4 || parts.some((v) => v === null)) {
      return NextResponse.json(
        { error: "bbox must be 'minLat,minLng,maxLat,maxLng'" },
        { status: 400 }
      );
    }
    const [minLat, minLng, maxLat, maxLng] = parts as [
      number,
      number,
      number,
      number
    ];

    const { data, error } = await supabase.rpc("accidents_in_bbox", {
      min_lat: minLat,
      min_lng: minLng,
      max_lat: maxLat,
      max_lng: maxLng,
      source_filter: source,
      category_filter: category,
      from_date: from,
      to_date: to,
      result_limit: limit,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const accidents = (data as AccidentRow[]).map(rowToAccident);
    return NextResponse.json({ accidents });
  }

  // bbox 없는 경우: 일반 select
  let query = supabase
    .from("accidents")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (category) query = query.in("category", category);
  if (source) query = query.in("source_type", source);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accidents = (data as AccidentRow[]).map(rowToAccident);
  return NextResponse.json({ accidents });
}

/**
 * POST /api/accidents
 *
 * 인증 우선 정책 (Phase 2):
 *   1. 로그인한 사용자: user JWT (cookie) 로 인서트 → RLS 정책이 created_by=auth.uid() 강제.
 *   2. 비로그인: 개발 편의를 위해 service role 로 인서트 (created_by NULL).
 *      Phase 3 에서는 401 로 막을 예정.
 *
 * 어떤 경우든 source_type 은 'user' 로 강제 (RLS 정책 일치).
 */
export async function POST(req: Request) {
  let body: AccidentInput;
  try {
    body = (await req.json()) as AccidentInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (
    !body.location ||
    !Number.isFinite(body.location.lat) ||
    !Number.isFinite(body.location.lng)
  ) {
    return NextResponse.json(
      { error: "location.lat / location.lng are required" },
      { status: 400 }
    );
  }
  if (!body.category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (!body.occurredAt) {
    return NextResponse.json(
      { error: "occurredAt is required" },
      { status: 400 }
    );
  }

  // 1) 인증 사용자 우선
  let userId: string | null = null;
  try {
    const sb = await getSupabaseServerClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // 환경변수 미설정 등 — 무시하고 admin fallback 으로
  }

  if (userId) {
    const sb = await getSupabaseServerClient();
    const insertRow = inputToInsertRow(body, {
      sourceType: "user",
      createdBy: userId,
    });
    const { data, error } = await sb
      .from("accidents")
      .insert(insertRow)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(rowToAccident(data as AccidentRow), {
      status: 201,
    });
  }

  // 2) Fallback: 비로그인 익명 등록 (Phase 1 호환)
  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  const insertRow = inputToInsertRow(body, {
    sourceType: "user",
    createdBy: null,
  });
  const { data, error } = await admin
    .from("accidents")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(rowToAccident(data as AccidentRow), {
    status: 201,
  });
}
