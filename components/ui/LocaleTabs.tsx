"use client";

import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";

export default function LocaleTabs() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = ui(locale);

  return (
    <div
      className="pointer-events-auto absolute left-3 top-3 z-20 flex rounded-lg border border-slate-200/90 bg-white/95 p-0.5 text-xs font-medium shadow-md backdrop-blur-sm"
      role="tablist"
      aria-label="Map language"
    >
      <button
        type="button"
        role="tab"
        aria-selected={locale === "ko"}
        onClick={() => setLocale("ko")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          locale === "ko"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {t.localeTabKo}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={locale === "en"}
        onClick={() => setLocale("en")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          locale === "en"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {t.localeTabEn}
      </button>
    </div>
  );
}
