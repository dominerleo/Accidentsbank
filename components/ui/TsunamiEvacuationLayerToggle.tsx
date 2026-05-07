"use client";

import { Waves, Eye, EyeOff } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import { useTsunamiEvacuationStore } from "@/hooks/useTsunamiEvacuationStore";

/**
 * 사이드바용 — 지진해일 대피지구 레이어 토글.
 *
 * - 기본 OFF. 사용자가 켤 때만 캐시 API 호출.
 * - 공공안전 토글과 시각적으로 분리 (emerald 색).
 */
export default function TsunamiEvacuationLayerToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);

  const visible = useTsunamiEvacuationStore((s) => s.visible);
  const loading = useTsunamiEvacuationStore((s) => s.loading);
  const error = useTsunamiEvacuationStore((s) => s.error);
  const itemCount = useTsunamiEvacuationStore((s) => s.items.length);
  const toggleVisible = useTsunamiEvacuationStore((s) => s.toggleVisible);

  return (
    <section className="border-b border-slate-100 px-4 py-3 sm:px-5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-700"
          aria-hidden
        >
          <Waves className="h-4 w-4" />
        </span>

        <div className="flex-1">
          <p className="text-[13px] font-semibold leading-tight text-slate-900">
            {t.tsunamiLayerTitle}
          </p>
          <p className="text-[11px] leading-snug text-slate-500">
            {t.tsunamiLayerSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleVisible()}
          aria-pressed={visible}
          className={
            "ml-1 inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors " +
            (visible
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200")
          }
        >
          {visible ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {visible ? t.psHide : t.psShowOnMap}
        </button>
      </div>

      {visible && (
        <p className="mt-2 text-[10px] text-slate-400">
          {loading
            ? t.tsunamiLoading
            : error
              ? t.tsunamiError
              : t.tsunamiLoadedCount(itemCount)}
        </p>
      )}
    </section>
  );
}
