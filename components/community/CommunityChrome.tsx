"use client";

import Link from "next/link";
import { Landmark, MessagesSquare } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import AuthButton from "@/components/ui/AuthButton";

export default function CommunityChrome() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = ui(locale);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-800 transition-colors hover:text-brand"
        >
          <Landmark className="h-6 w-6 text-brand" />
          <span className="font-semibold">{t.sidebarTitle}</span>
        </Link>
        <Link
          href="/community"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand"
        >
          <MessagesSquare className="h-4 w-4" />
          {t.navCommunity}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={locale === "ko"}
              onClick={() => setLocale("ko")}
              className={`rounded-md px-2.5 py-1 ${
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
              className={`rounded-md px-2.5 py-1 ${
                locale === "en"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.localeTabEn}
            </button>
          </div>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
