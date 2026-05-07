"use client";

import { ShieldAlert, Eye, EyeOff } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import { usePublicSafetyStore } from "@/hooks/usePublicSafetyStore";

/**
 * 사이드바용: 공공안전 주소 정보 레이어 표시 토글.
 *
 * - 기본 OFF. 사용자가 켤 때 처음으로 캐시 API 호출.
 * - API 실패 시에도 지도/사고 흐름은 영향받지 않도록 store 에서 비치명적 처리됨.
 * - TODO: 마커 수가 많아지면 클러스터링 도입 예정 (kakao.maps.MarkerClusterer 또는
 *         CustomOverlay 기반 그리드 클러스터링).
 */
export default function PublicSafetyLayerToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);

  const visible = usePublicSafetyStore((s) => s.visible);
  const loading = usePublicSafetyStore((s) => s.loading);
  const error = usePublicSafetyStore((s) => s.error);
  const itemCount = usePublicSafetyStore((s) => s.items.length);
  const toggleVisible = usePublicSafetyStore((s) => s.toggleVisible);

  return (
    <section className="border-b border-slate-100 px-4 py-3 sm:px-5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-violet-100 text-violet-700"
          aria-hidden
        >
          <ShieldAlert className="h-4 w-4" />
        </span>

        <div className="flex-1">
          <p className="text-[13px] font-semibold leading-tight text-slate-900">
            {t.psLayerTitle}
          </p>
          <p className="text-[11px] leading-snug text-slate-500">
            {t.psLayerSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleVisible()}
          aria-pressed={visible}
          className={
            "ml-1 inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors " +
            (visible
              ? "bg-violet-600 text-white hover:bg-violet-700"
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
            ? t.psLoading
            : error
              ? t.psError
              : t.psLoadedCount(itemCount)}
        </p>
      )}
    </section>
  );
}
