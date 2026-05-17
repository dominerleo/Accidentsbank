"use client";

import { useMapStore } from "@/hooks/useMapStore";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import {
  ACCIDENT_CATEGORIES,
  ACCIDENT_CATEGORY_ORDER,
  accidentCategoryLabel,
  type AccidentCategory,
} from "@/types";

export default function AccidentCategoryFilter() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const accidentFilter = useMapStore((s) => s.accidentFilter);
  const loadAccidents = useMapStore((s) => s.loadAccidents);
  const loading = useMapStore((s) => s.loading);

  const single =
    accidentFilter.category?.length === 1
      ? accidentFilter.category[0]
      : null;
  const isAll = !single;

  const selectMode = (mode: "all" | AccidentCategory) => {
    void loadAccidents(
      mode === "all" ? { category: undefined } : { category: [mode] }
    );
  };

  return (
    <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="mb-2 text-xs font-semibold text-slate-700">
        {t.categoryFilterTitle}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => selectMode("all")}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
            isAll
              ? "border-slate-800 bg-slate-800 text-white shadow-sm"
              : "border-slate-200 bg-slate-100/80 text-slate-600 hover:border-slate-300"
          }`}
        >
          {t.categoryAll}
        </button>
        {ACCIDENT_CATEGORY_ORDER.map((key) => {
          const on = single === key;
          const label = accidentCategoryLabel(key, locale);
          const color = ACCIDENT_CATEGORIES[key].color;
          return (
            <button
              key={key}
              type="button"
              disabled={loading}
              onClick={() => selectMode(key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                on
                  ? "border-transparent text-white shadow-sm"
                  : "border-slate-200 bg-slate-100/80 text-slate-500 opacity-70 hover:opacity-100"
              }`}
              style={on ? { backgroundColor: color } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">{t.categoryFilterHint}</p>
    </div>
  );
}
