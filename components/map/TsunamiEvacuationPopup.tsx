"use client";

import { CustomOverlayMap } from "react-kakao-maps-sdk";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import type { TsunamiEvacuationItem } from "@/hooks/useTsunamiEvacuationStore";

interface Props {
  item: TsunamiEvacuationItem;
  onClose: () => void;
}

function formatFetchedAt(iso: string, locale: "ko" | "en"): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(locale === "en" ? "en-US" : "ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TsunamiEvacuationPopup({ item, onClose }: Props) {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);

  if (!item) return null;
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const displayAddress = item.displayAddress ?? "-";
  const sourceName = item.sourceName ?? "-";
  const fetchedAt = item.fetchedAt
    ? formatFetchedAt(item.fetchedAt, locale)
    : "-";

  return (
    <CustomOverlayMap
      position={{ lat, lng }}
      yAnchor={1.05}
      xAnchor={0.5}
      zIndex={10}
    >
      <div
        className="min-w-[240px] max-w-[300px] rounded-lg border border-emerald-200 bg-white p-3 text-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {t.tsunamiPopupCategoryLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t.detailCloseAria}
          >
            ×
          </button>
        </div>
        <p className="text-[11px] text-slate-500">{t.tsunamiLayerTitle}</p>

        <dl className="mt-2 space-y-1.5">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">
              {t.psPopupLocation}
            </dt>
            <dd className="text-sm font-medium text-slate-900">
              {displayAddress}
            </dd>
          </div>

          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">
              {t.psPopupSource}
            </dt>
            <dd className="text-xs text-slate-700">{sourceName}</dd>
          </div>

          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">
              {t.psPopupUpdated}
            </dt>
            <dd className="text-xs text-slate-700">{fetchedAt}</dd>
          </div>
        </dl>

        <p className="mt-2 text-[10px] leading-snug text-slate-400">
          {t.tsunamiLayerSubtitle}
        </p>
      </div>
    </CustomOverlayMap>
  );
}
