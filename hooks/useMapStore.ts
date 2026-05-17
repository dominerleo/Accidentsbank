"use client";

import { create } from "zustand";
import type { Accident, AccidentInput, AccidentPatch, LatLng } from "@/types";
import { DEFAULT_CENTER, DEFAULT_LEVEL } from "@/lib/kakao/config";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";

export interface AccidentFilter {
  bbox?: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  category?: string[];
  source?: string[];
  from?: string;
  to?: string;
  limit?: number;
}

/** Supabase 전체(뉴스·사고 등)를 지도에 올리기 위해 기본은 기간 제한 없음. API limit 은 상한 유지. */
const DEFAULT_FETCH_LIMIT = 3000;

interface MapState {
  center: LatLng;
  level: number;
  selectedPoint: LatLng | null;
  selectedAccident: Accident | null;
  accidents: Accident[];
  isFormOpen: boolean;
  isKorea: boolean;

  /** 목록/지도 조회에 쓰는 필터 */
  accidentFilter: AccidentFilter;

  loading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;

  setCenter: (center: LatLng) => void;
  /** 지도 컴포넌트(카카오/Leaflet)의 사용자 드래그 결과를 store 에 반영. epsilon 비교로 무한 루프 방지. */
  syncCenterFromMap: (center: LatLng) => void;
  setLevel: (level: number) => void;
  selectPoint: (point: LatLng | null) => void;
  selectAccident: (accident: Accident | null) => void;
  setAccidents: (list: Accident[]) => void;
  addAccident: (a: Accident) => void;
  removeAccident: (id: string) => void;
  openForm: () => void;
  closeForm: () => void;
  setIsKorea: (v: boolean) => void;

  setAccidentFilter: (patch: Partial<AccidentFilter>) => void;
  loadAccidents: (override?: Partial<AccidentFilter>) => Promise<void>;
  createAccident: (input: AccidentInput) => Promise<Accident>;
  updateAccident: (id: string, patch: AccidentPatch) => Promise<Accident>;
  deleteAccident: (id: string, opts?: { devSecret?: string }) => Promise<void>;
  /** 목록·마커 클릭 시 지도 중심·줌·상세를 한 번에 */
  focusAccidentOnMap: (a: Accident) => void;
  /** 지명 검색 등: 좌표로만 지도 이동 (사고 상세·핀 선택 해제) */
  focusMapLocation: (location: LatLng, level?: number) => void;
  purgeAllAccidents: () => Promise<number>;
}

function buildAccidentsUrl(filter: AccidentFilter): string {
  const params = new URLSearchParams();
  if (filter.bbox) params.set("bbox", filter.bbox.join(","));
  if (filter.category?.length) params.set("category", filter.category.join(","));
  if (filter.source?.length) params.set("source", filter.source.join(","));
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.limit) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return qs ? `/api/accidents?${qs}` : "/api/accidents";
}

export const useMapStore = create<MapState>((set, get) => ({
  center: { ...DEFAULT_CENTER },
  level: DEFAULT_LEVEL,
  selectedPoint: null,
  selectedAccident: null,
  accidents: [],
  isFormOpen: false,
  isKorea: process.env.NEXT_PUBLIC_IS_KOREA !== "false",

  accidentFilter: { limit: DEFAULT_FETCH_LIMIT },

  loading: false,
  saving: false,
  deleting: false,
  error: null,

  setCenter: (center) => set({ center }),
  syncCenterFromMap: (center) => {
    const cur = get().center;
    if (
      Math.abs(cur.lat - center.lat) < 1e-7 &&
      Math.abs(cur.lng - center.lng) < 1e-7
    ) {
      return;
    }
    set({ center });
  },
  setLevel: (level) => set({ level }),
  selectPoint: (selectedPoint) => set({ selectedPoint }),
  selectAccident: (selectedAccident) => set({ selectedAccident }),
  setAccidents: (accidents) => set({ accidents }),
  addAccident: (a) => set((s) => ({ accidents: [a, ...s.accidents] })),
  removeAccident: (id) =>
    set((s) => ({
      accidents: s.accidents.filter((x) => x.id !== id),
      selectedAccident:
        s.selectedAccident?.id === id ? null : s.selectedAccident,
    })),
  openForm: () => set({ isFormOpen: true }),
  closeForm: () => set({ isFormOpen: false }),
  setIsKorea: (isKorea) => set({ isKorea }),

  setAccidentFilter: (patch) =>
    set((s) => ({ accidentFilter: { ...s.accidentFilter, ...patch } })),

  loadAccidents: async (override) => {
    const filter = override
      ? { ...get().accidentFilter, ...override }
      : get().accidentFilter;
    if (override) {
      set({ accidentFilter: filter });
    }
    set({ loading: true, error: null });
    try {
      const res = await fetch(buildAccidentsUrl(filter), { cache: "no-store" });
      if (!res.ok) {
        const msg = await res.text();
        const te = ui(useLocaleStore.getState().locale);
        throw new Error(te.errorLoadList(res.status, msg));
      }
      const json = (await res.json()) as { accidents?: Accident[] };
      set({ accidents: json.accidents ?? [], loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  createAccident: async (input) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch("/api/accidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const te = ui(useLocaleStore.getState().locale);
        throw new Error(
          (body as { error?: string }).error ?? te.errorCreateFallback(res.status)
        );
      }
      const created = (await res.json()) as Accident;
      set({ saving: false });
      await get().loadAccidents();
      return created;
    } catch (e) {
      set({
        saving: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  updateAccident: async (id, patch) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/accidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const te = ui(useLocaleStore.getState().locale);
        throw new Error(
          (body as { error?: string }).error ?? te.errorUpdateFallback(res.status)
        );
      }
      const updated = body as Accident;
      set({ saving: false });
      await get().loadAccidents();
      set((s) => ({
        selectedAccident:
          s.selectedAccident?.id === id ? updated : s.selectedAccident,
      }));
      return updated;
    } catch (e) {
      set({
        saving: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  focusAccidentOnMap: (a) =>
    set({
      center: { lat: a.location.lat, lng: a.location.lng },
      level: 4,
      selectedAccident: a,
      selectedPoint: null,
    }),

  focusMapLocation: (location, level = 4) =>
    set({
      center: { lat: location.lat, lng: location.lng },
      level,
      selectedAccident: null,
      selectedPoint: null,
    }),

  purgeAllAccidents: async () => {
    set({ deleting: true, error: null });
    try {
      const res = await fetch("/api/accidents/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const te = ui(useLocaleStore.getState().locale);
        throw new Error(
          (body as { error?: string }).error ?? te.errorPurgeFallback(res.status)
        );
      }
      const deleted = (body as { deleted?: number }).deleted ?? 0;
      set({
        deleting: false,
        selectedAccident: null,
        accidents: [],
      });
      await get().loadAccidents();
      return deleted;
    } catch (e) {
      set({
        deleting: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  deleteAccident: async (id, opts) => {
    set({ deleting: true, error: null });
    try {
      const headers: Record<string, string> = {};
      if (opts?.devSecret) {
        headers["x-admin-delete-secret"] = opts.devSecret;
      }
      const res = await fetch(`/api/accidents/${id}`, {
        method: "DELETE",
        headers,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const te = ui(useLocaleStore.getState().locale);
        throw new Error(
          (body as { error?: string }).error ?? te.errorDeleteFallback(res.status)
        );
      }
      get().removeAccident(id);
      set({ deleting: false });
      await get().loadAccidents();
    } catch (e) {
      set({
        deleting: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },
}));
