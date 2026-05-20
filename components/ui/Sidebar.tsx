"use client";

import { useEffect } from "react";
import {
  Landmark,
  Map as MapIcon,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Plus,
} from "lucide-react";
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
 * 사이드바 — 데스크탑(`md:` 이상)에서는 우측 패널.
 * 모바일에서는 지도 위 하단 시트로 열어 화면을 통째로 가리지 않는다.
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
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setDesktopCollapsed(false);
          }}
          className="fixed inset-x-3 z-30 flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur-sm transition-colors hover:bg-white md:hidden"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          aria-label={locale === "en" ? "Open menu" : "메뉴 열기"}
          aria-expanded={false}
        >
          <Menu className="h-4 w-4" aria-hidden />
          <span>{t.panelOpenMobile}</span>
        </button>
      )}

      {desktopCollapsed && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setDesktopCollapsed(false);
          }}
          className="fixed right-3 top-3 z-30 hidden items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white md:flex"
          aria-label={locale === "en" ? "Open panel" : "패널 열기"}
          aria-expanded={false}
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
          <span>{t.panelOpen}</span>
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
          "fixed inset-x-0 bottom-0 z-40 md:absolute md:inset-y-0 md:left-auto md:right-0",
          "flex h-[76dvh] min-h-[320px] max-h-[680px] w-full max-w-full flex-col md:h-full md:min-h-0 md:max-h-none md:w-[var(--sidebar-width)]",
          "rounded-t-2xl border-t border-slate-200/70 bg-white/95 shadow-2xl backdrop-blur-md md:rounded-none md:border-l md:border-t-0",
          "transform transition-transform duration-200 ease-out",
          desktopCollapsed
            ? "translate-y-full md:translate-x-full md:translate-y-0"
            : open
              ? "translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-x-0 md:translate-y-0",
        ].join(" ")}
        aria-label={locale === "en" ? "Sidebar" : "사이드바"}
        aria-hidden={desktopCollapsed ? true : undefined}
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1.5 w-11 rounded-full bg-slate-300" />
        </div>

        <header className="flex items-center gap-2 border-b border-slate-200 px-4 pb-3 pt-2 sm:px-5 md:py-4">
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
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(min-width: 768px)").matches) {
                  setDesktopCollapsed(true);
                } else {
                  setOpen(false);
                }
              }}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              aria-label={locale === "en" ? "Show map" : "지도 보기"}
            >
              <MapIcon className="h-4 w-4 md:hidden" aria-hidden />
              <PanelRightClose className="hidden h-4 w-4 md:block" aria-hidden />
              <span className="md:hidden">{t.panelShowMap}</span>
              <span className="hidden md:inline">{t.panelExpandMap}</span>
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

        <footer
          className="border-t border-slate-200 px-4 pt-3 sm:px-5"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
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
