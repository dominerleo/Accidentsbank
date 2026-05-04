"use client";

import { useMapStore } from "@/hooks/useMapStore";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import type { AccidentCategory } from "@/types";
import {
  ACCIDENT_CATEGORIES,
  accidentCategoryLabel,
  getAccidentCategoryMeta,
} from "@/types";
import { formatDate } from "@/lib/utils";
import type { AppLocale } from "@/types/locale";
import { ui, type UiStrings } from "@/lib/i18n/ui";

function emptyStateCopy(
  t: UiStrings,
  error: string | null,
  loading: boolean,
  categoryFilter: string[] | undefined,
  locale: AppLocale
): { title: string; hint: string } {
  if (error) {
    return {
      title: t.listErrorTitle,
      hint: error,
    };
  }
  if (loading) {
    return {
      title: t.listLoading,
      hint: t.listLoadingHint,
    };
  }
  const one =
    categoryFilter?.length === 1 ? categoryFilter[0] : undefined;
  if (one && ACCIDENT_CATEGORIES[one as AccidentCategory]) {
    const label = accidentCategoryLabel(one as AccidentCategory, locale);
    return {
      title: t.listEmptyOneTitle(label),
      hint: t.listEmptyOneHint,
    };
  }
  return {
    title: t.listEmptyAllTitle,
    hint: t.listEmptyAllHint,
  };
}

export default function AccidentList() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const accidents = useMapStore((s) => s.accidents);
  const focusAccidentOnMap = useMapStore((s) => s.focusAccidentOnMap);
  const accidentFilter = useMapStore((s) => s.accidentFilter);
  const error = useMapStore((s) => s.error);
  const loading = useMapStore((s) => s.loading);

  if (accidents.length === 0) {
    const { title, hint } = emptyStateCopy(
      t,
      error,
      loading,
      accidentFilter.category,
      locale
    );
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="text-4xl">🏦</div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p
          className={`text-xs ${error ? "text-red-600" : "text-slate-500"} max-w-[240px]`}
        >
          {hint}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {accidents.map((a) => {
        if (!a) return null;
        const meta = getAccidentCategoryMeta(a.category);
        const label = accidentCategoryLabel(a.category, locale);
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => focusAccidentOnMap(a)}
              className="flex w-full flex-col gap-1 px-5 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="text-xs font-medium text-slate-500">
                  {label} · {formatDate(a.occurredAt)}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                {a.title}
              </p>
              <p className="text-xs text-slate-500 line-clamp-1">
                {a.address?.roadAddress ?? a.address?.jibunAddress ?? "-"}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
