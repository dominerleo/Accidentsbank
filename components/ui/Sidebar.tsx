"use client";

import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useMapStore } from "@/hooks/useMapStore";
import { ui } from "@/lib/i18n/ui";
import AccidentForm from "./AccidentForm";
import AccidentList from "./AccidentList";
import AuthButton from "./AuthButton";
import AccidentDateFilter from "./AccidentDateFilter";
import AccidentCategoryFilter from "./AccidentCategoryFilter";
import DataSourceStatus from "./DataSourceStatus";
import HomeCommunityPreview from "./HomeCommunityPreview";
import PlaceSearchBar from "./PlaceSearchBar";

export default function Sidebar() {
  const { isFormOpen, closeForm } = useMapStore();
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);

  return (
    <aside
      className="absolute right-0 top-0 z-10 flex h-full max-h-full min-h-0 w-[var(--sidebar-width)] max-w-full flex-col border-l border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur-md"
      aria-label={locale === "en" ? "Sidebar" : "사이드바"}
    >
      <header className="shrink-0 border-b border-slate-200 px-5 py-3 sm:py-4">
        <div className="flex items-start gap-2">
          <Landmark className="h-6 w-6 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight text-slate-900">
              {t.sidebarTitle}
            </h1>
            <span className="text-xs text-slate-500">{t.sidebarSubtitle}</span>
          </div>
          <div className="shrink-0 pt-0.5">
            <AuthButton />
          </div>
        </div>
        <nav
          className="mt-2 flex w-full flex-nowrap items-center justify-center gap-1.5"
          aria-label={locale === "en" ? "Main navigation" : "주 메뉴"}
        >
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-brand/50 hover:text-brand"
          >
            {t.navMap}
          </Link>
          <Link
            href="/community"
            className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-brand/50 hover:text-brand"
          >
            {t.navCommunity}
          </Link>
        </nav>
      </header>

      {/* 헤더·푸터 사이 전체를 한 영역에서 세로 스크롤 (모바일에서 미리보기 하단까지 도달 가능) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain scrollbar-hide touch-pan-y">
        <PlaceSearchBar />

        <AccidentDateFilter />

        <AccidentCategoryFilter />

        <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-5 py-2">
          <DataSourceStatus />
        </div>

        {!isFormOpen ? <HomeCommunityPreview /> : null}

        {isFormOpen ? (
          <AccidentForm onClose={closeForm} />
        ) : (
          <AccidentList />
        )}

        <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" aria-hidden />
      </div>

      <footer className="shrink-0 border-t border-slate-200 px-5 py-3">
        <button
          type="button"
          onClick={() => useMapStore.getState().openForm()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          {t.recordCta}
        </button>
      </footer>
    </aside>
  );
}
