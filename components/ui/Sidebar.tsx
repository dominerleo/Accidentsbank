"use client";

import { Landmark, Search, Plus } from "lucide-react";
import { useMapStore } from "@/hooks/useMapStore";
import AccidentForm from "./AccidentForm";
import AccidentList from "./AccidentList";
import AuthButton from "./AuthButton";

export default function Sidebar() {
  const { isFormOpen, closeForm } = useMapStore();

  return (
    <aside
      className="absolute right-0 top-0 z-10 flex h-full w-[var(--sidebar-width)] max-w-full flex-col border-l border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur-md"
      aria-label="사이드바"
    >
      <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Landmark className="h-6 w-6 text-brand" />
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-tight text-slate-900">
            사고은행
          </h1>
          <span className="text-xs text-slate-500">Accidents Bank</span>
        </div>
        <div className="ml-auto">
          <AuthButton />
        </div>
      </header>

      <div className="border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="지역·키워드 검색"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
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
          사고 기록하기
        </button>
      </footer>
    </aside>
  );
}
