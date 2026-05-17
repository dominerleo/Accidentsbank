"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResult =
  | {
      ok: true;
      fetched: number;
      upserted: number;
      geocodeFailed: number;
      skipped: number;
      pageNo: number;
      numOfRows: number;
      totalCount?: number;
      auth?: { via?: string };
    }
  | {
      ok: false;
      error?: string;
      code?: string;
      message?: string;
    };

export default function PublicSafetyAdminClient() {
  const router = useRouter();
  const [pageNo, setPageNo] = useState(1);
  const [numOfRows, setNumOfRows] = useState(20);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function runSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/public-safety/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageNo, numOfRows }),
      });
      const json = (await res.json().catch(() => ({}))) as SyncResult;
      setResult(
        "ok" in json
          ? json
          : {
              ok: false,
              error: `동기화 요청 실패 (${res.status})`,
            }
      );
      if (res.ok && json.ok) {
        router.refresh();
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
          pageNo
          <input
            type="number"
            min={1}
            value={pageNo}
            onChange={(e) => setPageNo(Math.max(1, Number(e.target.value) || 1))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
          numOfRows
          <input
            type="number"
            min={1}
            max={100}
            value={numOfRows}
            onChange={(e) =>
              setNumOfRows(
                Math.min(100, Math.max(1, Number(e.target.value) || 20))
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </label>

        <button
          type="button"
          onClick={runSync}
          disabled={syncing}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
        >
          {syncing ? "동기화 중..." : "정부 API에서 새로 가져오기"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        서버에서만 정부 API 키와 카카오 REST 키를 사용합니다. 원본 민감정보와 API 키는
        화면에 표시하지 않습니다. numOfRows는 서버에서도 최대 100으로 제한됩니다.
      </p>

      {result && (
        <div
          className={
            "mt-4 rounded-xl border p-4 text-sm " +
            (result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900")
          }
        >
          {result.ok ? (
            <div>
              <p className="font-semibold">동기화가 완료되었습니다.</p>
              <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Stat label="가져온 건수" value={result.fetched} />
                <Stat label="저장/갱신" value={result.upserted} />
                <Stat label="좌표 실패" value={result.geocodeFailed} />
                <Stat label="건너뜀" value={result.skipped} />
                <Stat label="요청 페이지" value={result.pageNo} />
              </dl>
            </div>
          ) : (
            <div>
              <p className="font-semibold">동기화에 실패했습니다.</p>
              <p className="mt-1 text-xs">
                {result.error ?? result.message ?? result.code ?? "알 수 없는 오류"}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] text-current/70">{label}</dt>
      <dd className="text-lg font-bold">{value.toLocaleString("ko-KR")}</dd>
    </div>
  );
}
