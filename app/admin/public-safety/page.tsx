import Link from "next/link";
import { checkAdminAuth } from "@/lib/public-safety/adminAuth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import PublicSafetyAdminClient from "./PublicSafetyAdminClient";

export const dynamic = "force-dynamic";

type CacheRow = {
  id: string;
  category: string;
  source_type: string;
  source_name: string;
  display_address: string;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  ri: string | null;
  latitude: number | null;
  longitude: number | null;
  fetched_at: string;
  expires_at: string | null;
};

type PageData =
  | {
      ok: true;
      totalCount: number;
      withCoordsCount: number;
      withoutCoordsCount: number;
      rows: CacheRow[];
    }
  | {
      ok: false;
      error: string;
    };

async function loadPageData(): Promise<PageData> {
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Supabase 클라이언트를 만들 수 없습니다.",
    };
  }

  const totalReq = supabase
    .from("public_safety_address_cache")
    .select("id", { count: "exact", head: true });

  const withCoordsReq = supabase
    .from("public_safety_address_cache")
    .select("id", { count: "exact", head: true })
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const rowsReq = supabase
    .from("public_safety_address_cache")
    .select(
      "id, category, source_type, source_name, display_address, sido, sigungu, eupmyeondong, ri, latitude, longitude, fetched_at, expires_at"
    )
    .order("fetched_at", { ascending: false })
    .limit(100);

  const [totalRes, withCoordsRes, rowsRes] = await Promise.all([
    totalReq,
    withCoordsReq,
    rowsReq,
  ]);

  const firstError = totalRes.error ?? withCoordsRes.error ?? rowsRes.error;
  if (firstError) {
    return { ok: false, error: firstError.message };
  }

  const totalCount = totalRes.count ?? 0;
  const withCoordsCount = withCoordsRes.count ?? 0;

  return {
    ok: true,
    totalCount,
    withCoordsCount,
    withoutCoordsCount: Math.max(0, totalCount - withCoordsCount),
    rows: (rowsRes.data ?? []) as CacheRow[],
  };
}

export default async function PublicSafetyAdminPage() {
  const auth = await checkAdminAuth();

  if (!auth.ok) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">접근할 수 없습니다</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            관리자 권한이 필요합니다.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            이 페이지는 `profiles.role`이 `admin` 또는 `moderator`이거나,
            `.env.local`의 `ADMIN_EMAILS`에 포함된 로그인 사용자만 접근할 수
            있습니다.
          </p>
          <p className="mt-2 text-xs text-slate-400">reason: {auth.reason}</p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            지도로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const data = await loadPageData();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              관리자 · 공공 안전정보
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              성범죄자 공개·고지 주소 정보 동기화
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              정부 API는 지도 화면에서 직접 호출하지 않습니다. 이 화면에서 서버
              동기화를 실행하면 `public_safety_address_cache`에 저장된 캐시를
              지도 레이어가 조회합니다.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            지도 확인
          </Link>
        </header>

        {data.ok ? (
          <>
            <section className="grid gap-3 sm:grid-cols-4">
              <SummaryCard label="총 캐시 건수" value={data.totalCount} />
              <SummaryCard
                label="좌표 있는 항목"
                value={data.withCoordsCount}
                tone="emerald"
              />
              <SummaryCard
                label="좌표 없는 항목"
                value={data.withoutCoordsCount}
                tone="amber"
              />
              <SummaryCard
                label="지도 표시 가능"
                value={data.withCoordsCount}
                tone="violet"
              />
            </section>

            <PublicSafetyAdminClient />

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold">캐시 목록</h2>
                <p className="mt-1 text-xs text-slate-500">
                  최신 갱신순 최대 100건만 표시합니다. 이름, 사진, 상세 범죄내용,
                  원본 응답, API 키는 표시하지 않습니다.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">주소</th>
                      <th className="px-5 py-3">출처</th>
                      <th className="px-5 py-3">좌표</th>
                      <th className="px-5 py-3">지도 표시</th>
                      <th className="px-5 py-3">갱신일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-sm text-slate-500"
                        >
                          아직 캐시된 공공 안전정보가 없습니다. 위 버튼으로 먼저
                          동기화를 실행하세요.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((row) => {
                        const canShowOnMap =
                          row.latitude != null && row.longitude != null;
                        return (
                          <tr key={row.id} className="align-top">
                            <td className="max-w-sm px-5 py-3">
                              <p className="font-medium text-slate-900">
                                {row.display_address}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {[row.sido, row.sigungu, row.eupmyeondong, row.ri]
                                  .filter(Boolean)
                                  .join(" ") || "-"}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-600">
                              {row.source_name}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-600">
                              {canShowOnMap
                                ? `${row.latitude?.toFixed(6)}, ${row.longitude?.toFixed(6)}`
                                : "좌표 없음"}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={
                                  "inline-flex rounded-full px-2 py-1 text-xs font-semibold " +
                                  (canShowOnMap
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700")
                                }
                              >
                                {canShowOnMap ? "표시 가능" : "표시 불가"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500">
                              {formatDate(row.fetched_at)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-800 shadow-sm">
            <p className="font-semibold">캐시 목록을 불러오지 못했습니다.</p>
            <p className="mt-1 text-xs">{data.error}</p>
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "violet";
}) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold text-current/60">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString("ko-KR")}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
