"use client";

import { useCallback, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useMapStore } from "@/hooks/useMapStore";
import { useSidebarStore } from "@/hooks/useSidebarStore";
import { ui } from "@/lib/i18n/ui";
import type { PlaceSearchResultItem } from "@/types";

export default function PlaceSearchBar() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const isKorea = useMapStore((s) => s.isKorea);
  const focusMapLocation = useMapStore((s) => s.focusMapLocation);
  const selectAccident = useMapStore((s) => s.selectAccident);
  const closeSidebar = useSidebarStore((s) => s.setOpen);

  // 모바일(< md)에서는 검색 후 지도가 보여야 하므로 사이드바를 닫는다.
  // 데스크탑은 항상 보이므로 setOpen(false) 호출해도 영향 없음.
  const closeSidebarOnMobile = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      closeSidebar(false);
    }
  }, [closeSidebar]);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<PlaceSearchResultItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const kakaoDisabled = locale === "ko" && !isKorea;
  const submitDisabled = busy || kakaoDisabled;

  const runSearch = useCallback(async () => {
    const q = query.trim();
    setHint(null);
    if (kakaoDisabled) {
      setHint(t.placeSearchGlobalOff);
      return;
    }
    if (!q) {
      setHint(t.placeSearchEmpty);
      return;
    }

    setBusy(true);
    try {
      if (locale === "en") {
        const res = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(q)}&limit=15`,
          { cache: "no-store" }
        );
        const body = (await res.json()) as {
          places?: PlaceSearchResultItem[];
          totalCount?: number;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? `Search failed (${res.status})`);
        }
        const raw = body.places ?? [];
        const places: PlaceSearchResultItem[] = raw.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category ?? "",
          address: p.address ?? "",
          roadAddress: p.roadAddress ?? p.name,
          lat: p.lat,
          lng: p.lng,
        }));
        const tot = body.totalCount ?? places.length;
        setTotalCount(tot);

        if (places.length === 0) {
          setPickerOpen(false);
          setCandidates([]);
          setHint(t.placeSearchNoResults);
          return;
        }

        selectAccident(null);

        if (places.length === 1) {
          const p = places[0];
          focusMapLocation({ lat: p.lat, lng: p.lng }, 4);
          setPickerOpen(false);
          setCandidates([]);
          setHint(t.placeSearchMoved(p.name));
          closeSidebarOnMobile();
          return;
        }

        setCandidates(places);
        setPickerOpen(true);
        setHint(t.placeSearchMultiHint(places.length, tot));
        return;
      }

      const res = await fetch(
        `/api/kakao/keyword?q=${encodeURIComponent(q)}&size=15`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as {
        places?: PlaceSearchResultItem[];
        totalCount?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? t.placeSearchKakaoFailed(res.status));
      }
      const places = body.places ?? [];
      const tot = body.totalCount ?? places.length;
      setTotalCount(tot);

      if (places.length === 0) {
        setPickerOpen(false);
        setCandidates([]);
        setHint(t.placeSearchNoResults);
        return;
      }

      selectAccident(null);

      if (places.length === 1) {
        const p = places[0];
        focusMapLocation({ lat: p.lat, lng: p.lng }, 4);
        setPickerOpen(false);
        setCandidates([]);
        setHint(t.placeSearchMoved(p.name));
        closeSidebarOnMobile();
        return;
      }

      setCandidates(places);
      setPickerOpen(true);
      setHint(t.placeSearchMultiHint(places.length, tot));
    } catch (e) {
      setHint(e instanceof Error ? e.message : String(e));
      setPickerOpen(false);
      setCandidates([]);
    } finally {
      setBusy(false);
    }
  }, [
    query,
    kakaoDisabled,
    locale,
    focusMapLocation,
    selectAccident,
    t,
    closeSidebarOnMobile,
  ]);

  const pickPlace = (p: PlaceSearchResultItem) => {
    focusMapLocation({ lat: p.lat, lng: p.lng }, 4);
    setPickerOpen(false);
    setCandidates([]);
    setHint(t.placeSearchMoved(p.name));
    closeSidebarOnMobile();
  };

  const addressLines = (p: PlaceSearchResultItem) => {
    const lines: string[] = [];
    if (p.roadAddress) lines.push(`${t.placeSearchRoad}: ${p.roadAddress}`);
    if (p.address) lines.push(`${t.placeSearchJibun}: ${p.address}`);
    if (lines.length === 0) lines.push(t.placeSearchNoAddr);
    return lines;
  };

  return (
    <>
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <form
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.placeSearchPlaceholder}
            disabled={submitDisabled}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-60"
            aria-label={t.placeSearchAria}
          />
          <button
            type="submit"
            disabled={submitDisabled}
            className="shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {busy ? t.placeSearchBusy : t.placeSearchGo}
          </button>
        </form>
        {hint && (
          <p className="mt-2 text-[11px] leading-snug text-slate-600">{hint}</p>
        )}
        {kakaoDisabled && (
          <p className="mt-1 text-[10px] text-amber-700">
            {t.placeSearchGlobalOff}
          </p>
        )}
      </div>

      {pickerOpen && candidates.length > 1 && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPickerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.placeSearchPickerTitle}
        >
          <div
            className="flex max-h-[min(80vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {t.placeSearchPickerTitle}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {t.placeSearchPickerSub(candidates.length, totalCount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label={t.formClose}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {candidates.map((p, idx) => (
                <li key={`${p.id}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => pickPlace(p)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                      {addressLines(p).map((line, i) => (
                        <p
                          key={i}
                          className="text-[11px] leading-snug text-slate-600"
                        >
                          {line}
                        </p>
                      ))}
                      {p.category ? (
                        <p className="mt-1 line-clamp-1 text-[10px] text-slate-400">
                          {p.category}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
