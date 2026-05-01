"use client";

import { create } from "zustand";
import type { Accident, AccidentInput, LatLng } from "@/types";
import { DEFAULT_CENTER, DEFAULT_LEVEL } from "@/lib/kakao/config";

export interface AccidentFilter {
  bbox?: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  category?: string[];
  source?: string[];
  from?: string;
  to?: string;
  limit?: number;
}

interface MapState {
  center: LatLng;
  level: number;
  selectedPoint: LatLng | null;
  selectedAccident: Accident | null;
  accidents: Accident[];
  isFormOpen: boolean;
  isKorea: boolean;

  /** 데이터 로딩 상태 */
  loading: boolean;
  /** 등록 중 상태 */
  saving: boolean;
  /** 마지막 에러 메시지 */
  error: string | null;

  setCenter: (center: LatLng) => void;
  setLevel: (level: number) => void;
  selectPoint: (point: LatLng | null) => void;
  selectAccident: (accident: Accident | null) => void;
  setAccidents: (list: Accident[]) => void;
  addAccident: (a: Accident) => void;
  openForm: () => void;
  closeForm: () => void;
  setIsKorea: (v: boolean) => void;

  /** 서버에서 사고 목록을 다시 가져와 store 갱신 */
  loadAccidents: (filter?: AccidentFilter) => Promise<void>;
  /** 사고를 서버에 등록하고 store 에 prepend */
  createAccident: (input: AccidentInput) => Promise<Accident>;
}

function buildAccidentsUrl(filter?: AccidentFilter): string {
  if (!filter) return "/api/accidents";
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

export const useMapStore = create<MapState>((set) => ({
  center: { ...DEFAULT_CENTER },
  level: DEFAULT_LEVEL,
  selectedPoint: null,
  selectedAccident: null,
  accidents: [],
  isFormOpen: false,
  isKorea: process.env.NEXT_PUBLIC_IS_KOREA !== "false",

  loading: false,
  saving: false,
  error: null,

  setCenter: (center) => set({ center }),
  setLevel: (level) => set({ level }),
  selectPoint: (selectedPoint) => set({ selectedPoint }),
  selectAccident: (selectedAccident) => set({ selectedAccident }),
  setAccidents: (accidents) => set({ accidents }),
  addAccident: (a) => set((s) => ({ accidents: [a, ...s.accidents] })),
  openForm: () => set({ isFormOpen: true }),
  closeForm: () => set({ isFormOpen: false }),
  setIsKorea: (isKorea) => set({ isKorea }),

  loadAccidents: async (filter) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(buildAccidentsUrl(filter), { cache: "no-store" });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`사고 목록 조회 실패: ${res.status} ${msg}`);
      }
      const json = (await res.json()) as { accidents: Accident[] };
      set({ accidents: json.accidents, loading: false });
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
        throw new Error(
          (body as { error?: string }).error ?? `등록 실패 (${res.status})`
        );
      }
      const created = (await res.json()) as Accident;
      set((s) => ({
        accidents: [created, ...s.accidents],
        saving: false,
      }));
      return created;
    } catch (e) {
      set({
        saving: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },
}));
