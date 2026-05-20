"use client";

import { useEffect } from "react";
import { Landmark, Menu, Plus, X } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useMapStore } from "@/hooks/useMapStore";
import { useSidebarStore } from "@/hooks/useSidebarStore";
import { ui } from "@/lib/i18n/ui";
import AccidentForm from "./AccidentForm";
import AccidentList from "./AccidentList";
import AuthButton from "./AuthButton";
import AccidentDateFilter from "./AccidentDateFilter";
import AccidentCategoryFilter from "./AccidentCategoryFilter";
import DataSourceStatus from "./DataSourceStatus";
import PlaceSearchBar from "./PlaceSearchBar";
import PublicSafetyLayerToggle from "./PublicSafetyLayerToggle";
import TsunamiEvacuationLayerToggle from "./TsunamiEvacuationLayerToggle";

/**
 * 사이드바 — 데스크탑(`md:` 이상)에서는 항상 노출.
 * 모바일에서는 기본 숨김 + 우측 상단 햄버거 버튼으로 슬라이드 토글.
 */
export default function Sidebar() {
  const { isFormOpen, closeForm } = useMapStore();
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const open = useSidebarStore((s) => s.open);
  const setOpen = useSidebarStore((s) => s.setOpen);
  const desktopCollapsed = useSidebarStore((s) => s.desktopCollapsed);
  const setDesktopCollapsed = useSidebarStore((s) => s.setDesktopCollapsed);

  // 모바일에서 폼이 열리면 사이드바도 함께 열어줌 (작성 UI 가 보여야 하므로).
  useEffect(() => {
    if (isFormOpen) setOpen(true);
  }, [isFormOpen, setOpen]);

  // ESC 로 모바일 사이드바 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {/* 사이드바 닫혀있을 때만 보이는 열기 버튼 */}
      {(!open || desktopCollapsed) && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setDesktopCollapsed(false);
          }}
          className={[
            "fixed right-3 top-3 z-30 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white",
            desktopCollapsed ? "flex" : "flex md:hidden",
          ].join(" ")}
          aria-label={locale === "en" ? "Open menu" : "메뉴 열기"}
          aria-expanded={false}
        >
          <Menu className="h-4 w-4" aria-hidden />
          <span>{locale === "en" ? "Menu" : "메뉴"}</span>
        </button>
      )}

      {/* 모바일 백드롭 */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label={locale === "en" ? "Close menu" : "메뉴 닫기"}
        />
      )}

      <aside
        className={[
          "fixed md:absolute right-0 top-0 z-40",
          "flex h-full max-w-full flex-col",
          "w-full sm:w-[360px] md:w-[var(--sidebar-width)]",
          "border-l border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur-md",
          "transform transition-transform duration-200 ease-out",
          desktopCollapsed
            ? "translate-x-full"
            : open
              ? "translate-x-0"
              : "translate-x-full md:translate-x-0",
        ].join(" ")}
        aria-label={locale === "en" ? "Sidebar" : "사이드바"}
        aria-hidden={desktopCollapsed ? true : undefined}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <Landmark className="h-6 w-6 shrink-0 text-brand" aria-hidden />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-base font-bold leading-tight text-slate-900 sm:text-lg">
              {t.sidebarTitle}
            </h1>
            <span className="truncate text-[11px] text-slate-500 sm:text-xs">
              {t.sidebarSubtitle}
            </span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            <AuthButton />
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(min-width: 768px)").matches) {
                  setDesktopCollapsed(true);
                } else {
                  setOpen(false);
                }
              }}
              className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100"
              aria-label={locale === "en" ? "Close menu" : "메뉴 닫기"}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <PlaceSearchBar />

        <AccidentDateFilter />

        <AccidentCategoryFilter />

        <PublicSafetyLayerToggle />

        <TsunamiEvacuationLayerToggle />

        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 sm:px-5">
          <DataSourceStatus />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isFormOpen ? (
            <AccidentForm onClose={closeForm} />
          ) : (
            <AccidentList />
          )}
        </div>

        <footer className="border-t border-slate-200 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => useMapStore.getState().openForm()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t.recordCta}
          </button>
        </footer>
      </aside>
    </>
  );
}
