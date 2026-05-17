"use client";

import { useMapStore } from "@/hooks/useMapStore";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import type { AccidentCategory } from "@/types";
import { accidentCategoryLabel } from "@/types";

export default function DataSourceStatus() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const loading = useMapStore((s) => s.loading);
  const error = useMapStore((s) => s.error);
  const n = useMapStore((s) => s.accidents.length);
  const filter = useMapStore((s) => s.accidentFilter);

  const period =
    filter.from || filter.to
      ? `${filter.from ?? "…"} ~ ${filter.to ?? "…"}`
      : t.dataPeriodAll;

  const cats =
    !filter.category?.length
      ? t.dataCategoryAll
      : filter.category.length === 1
        ? accidentCategoryLabel(
            filter.category[0] as AccidentCategory,
            locale
          )
        : filter.category
            .map((c) =>
              accidentCategoryLabel(c as AccidentCategory, locale)
            )
            .join(locale === "en" ? " · " : " · ");

  return (
    <div className="space-y-1 text-[11px] leading-snug text-slate-600">
      <p>
        <span className="font-semibold text-slate-800">{t.dataSupabase}</span>
        <span className="text-slate-400"> · </span>
        <code className="rounded bg-white px-1 py-0.5 text-[10px] text-slate-700">
          {t.dataTable}
        </code>
        {loading ? (
          <span className="ml-1 text-brand">{t.dataLoading}</span>
        ) : (
          <span className="ml-1 text-slate-700">{t.dataCount(n)}</span>
        )}
      </p>
      <p className="text-slate-500">
        {t.dataPeriod}: {period} · {t.dataCategory}: {cats}
        {filter.limit ? t.dataMax(filter.limit) : ""}
      </p>
      {error && (
        <p className="rounded border border-red-100 bg-red-50 px-2 py-1 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
