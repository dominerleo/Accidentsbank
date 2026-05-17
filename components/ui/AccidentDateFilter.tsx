"use client";

import { useEffect, useState } from "react";
import { CalendarRange, RotateCcw } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useMapStore } from "@/hooks/useMapStore";
import { localDateYmd } from "@/lib/dateRange";
import { ui } from "@/lib/i18n/ui";

function last365Range() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 365);
  return { from: localDateYmd(from), to: localDateYmd(to) };
}

export default function AccidentDateFilter() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const accidentFilter = useMapStore((s) => s.accidentFilter);
  const loadAccidents = useMapStore((s) => s.loadAccidents);
  const loading = useMapStore((s) => s.loading);

  const [draftFrom, setDraftFrom] = useState(accidentFilter.from ?? "");
  const [draftTo, setDraftTo] = useState(accidentFilter.to ?? "");

  useEffect(() => {
    setDraftFrom(accidentFilter.from ?? "");
    setDraftTo(accidentFilter.to ?? "");
  }, [accidentFilter.from, accidentFilter.to]);

  const apply = () => {
    void loadAccidents({
      from: draftFrom || undefined,
      to: draftTo || undefined,
    });
  };

  const preset365 = () => {
    const r = last365Range();
    setDraftFrom(r.from);
    setDraftTo(r.to);
    void loadAccidents({ from: r.from, to: r.to });
  };

  const clearRange = () => {
    setDraftFrom("");
    setDraftTo("");
    void loadAccidents({ from: undefined, to: undefined });
  };

  return (
    <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
        {t.dateFilterTitle}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5 text-[10px] text-slate-500">
          {t.dateFilterStart}
          <input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[10px] text-slate-500">
          {t.dateFilterEnd}
          <input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
        <button
          type="button"
          onClick={apply}
          disabled={loading}
          className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {t.dateFilterApply}
        </button>
        <button
          type="button"
          onClick={preset365}
          disabled={loading}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          {t.dateFilter365}
        </button>
        <button
          type="button"
          onClick={clearRange}
          disabled={loading}
          className="flex items-center gap-0.5 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          title={t.dateFilterClearHelp}
        >
          <RotateCcw className="h-3 w-3" />
          {t.dateFilterClear}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">{t.dateFilterHint}</p>
    </div>
  );
}
