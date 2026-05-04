"use client";

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
import PlaceSearchBar from "./PlaceSearchBar";
import PublicSafetyLayerToggle from "./PublicSafetyLayerToggle";

export default function Sidebar() {
  const { isFormOpen, closeForm } = useMapStore();
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);

  return (
    <aside
      className="absolute right-0 top-0 z-10 flex h-full w-[var(--sidebar-width)] max-w-full flex-col border-l border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur-md"
      aria-label={locale === "en" ? "Sidebar" : "사이드바"}
    >
      <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Landmark className="h-6 w-6 text-brand" />
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-tight text-slate-900">
            {t.sidebarTitle}
          </h1>
          <span className="text-xs text-slate-500">{t.sidebarSubtitle}</span>
        </div>
        <div className="ml-auto">
          <AuthButton />
        </div>
      </header>

      <PlaceSearchBar />

      <AccidentDateFilter />

      <AccidentCategoryFilter />

      <PublicSafetyLayerToggle />

      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-2">
        <DataSourceStatus />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isFormOpen ? (
          <AccidentForm onClose={closeForm} />
        ) : (
          <AccidentList />
        )}
      </div>

      <footer className="border-t border-slate-200 px-5 py-3">
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
