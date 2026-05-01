"use client";

import { useMapStore } from "@/hooks/useMapStore";
import { ACCIDENT_CATEGORIES } from "@/types";
import { formatDate } from "@/lib/utils";

export default function AccidentList() {
  const { accidents, selectAccident } = useMapStore();

  if (accidents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="text-4xl">🏦</div>
        <p className="text-sm font-semibold text-slate-700">
          아직 기록된 사고가 없습니다
        </p>
        <p className="text-xs text-slate-500">
          지도를 클릭하여 첫 사고를 기록해 보세요.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {accidents.map((a) => {
        const meta = ACCIDENT_CATEGORIES[a.category];
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => selectAccident(a)}
              className="flex w-full flex-col gap-1 px-5 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="text-xs font-medium text-slate-500">
                  {meta.label} · {formatDate(a.occurredAt)}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                {a.title}
              </p>
              <p className="text-xs text-slate-500 line-clamp-1">
                {a.address.roadAddress ?? a.address.jibunAddress ?? "-"}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
