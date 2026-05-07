"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import MapView from "@/components/map/MapView";
import Sidebar from "@/components/ui/Sidebar";
import AccidentDetailModal from "@/components/ui/AccidentDetailModal";
import LocaleTabs from "@/components/ui/LocaleTabs";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useMapStore } from "@/hooks/useMapStore";
import { DEFAULT_CENTER, DEFAULT_LEVEL } from "@/lib/kakao/config";
import { ui } from "@/lib/i18n/ui";

const GlobalMapView = dynamic(
  () => import("@/components/map/GlobalMapView"),
  { ssr: false }
);

export default function HomePage() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const setCenter = useMapStore((s) => s.setCenter);
  const setLevel = useMapStore((s) => s.setLevel);
  const prevLocale = useRef<typeof locale | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "ko";
  }, [locale]);

  useEffect(() => {
    if (prevLocale.current === locale) return;
    const prev = prevLocale.current;
    prevLocale.current = locale;
    if (prev === null) {
      if (locale === "en") {
        setCenter({ lat: 20, lng: 10 });
        setLevel(3);
      }
      return;
    }
    if (locale === "en") {
      setCenter({ lat: 20, lng: 10 });
      setLevel(3);
    } else {
      setCenter({ ...DEFAULT_CENTER });
      setLevel(DEFAULT_LEVEL);
    }
  }, [locale, setCenter, setLevel]);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden">
      <div className="absolute inset-0 z-0 min-h-0 min-w-0">
        {locale === "ko" ? <MapView /> : <GlobalMapView />}
        <LocaleTabs />
        {locale === "en" && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
            {t.mapHintOsm}
          </div>
        )}
      </div>
      <Sidebar />
      <AccidentDetailModal />
    </main>
  );
}
