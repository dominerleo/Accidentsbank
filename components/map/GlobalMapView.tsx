"use client";

// TODO(public-safety): 영어/Leaflet 모드용 공공안전(성범죄자 공개·고지 주소) 레이어는 아직 미구현.
// 재난 대피시설(`useTsunamiEvacuationStore`)은 Leaflet 에 초록 원마커로 표시함.

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapStore } from "@/hooks/useMapStore";
import { useTsunamiEvacuationStore } from "@/hooks/useTsunamiEvacuationStore";
import { getAccidentCategoryMeta } from "@/types";

/**
 * 영어/세계 지도 모드에서는 store 의 `level` 을 Leaflet 의 zoom 으로 그대로 해석한다.
 * (한국어/Kakao 모드의 1~14 level 체계와는 다른 의미로 쓰임.)
 *
 * - detail=true 인 경우(사고 상세 선택 등) 거리뷰 수준으로 강제 확대
 * - 그 외에는 Leaflet 줌 한도(2~18)에서 클램프
 * - zoomSnap=0.25 이므로 분수 zoom(예: 5.25) 을 그대로 허용해야 부드러운 휠 줌이 유지됨
 */
function resolveLeafletZoom(level: number, detail: boolean): number {
  if (detail) return 13;
  const z = Number.isFinite(level) ? Number(level) : 5;
  return Math.min(18, Math.max(2, z));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function GlobalMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const disasterLayerRef = useRef<L.LayerGroup | null>(null);
  const prevViewRef = useRef<{
    lat: number;
    lng: number;
    z: number;
    sel?: string;
  } | null>(null);

  const accidents = useMapStore((s) => s.accidents);
  const center = useMapStore((s) => s.center);
  const level = useMapStore((s) => s.level);
  const selectedAccident = useMapStore((s) => s.selectedAccident);
  const selectAccident = useMapStore((s) => s.selectAccident);
  const selectPoint = useMapStore((s) => s.selectPoint);
  const openForm = useMapStore((s) => s.openForm);
  const setCenter = useMapStore((s) => s.setCenter);
  const loadAccidents = useMapStore((s) => s.loadAccidents);

  const tsVisible = useTsunamiEvacuationStore((s) => s.visible);
  const tsItems = useTsunamiEvacuationStore((s) => s.items);
  const tsSetSelectedId = useTsunamiEvacuationStore((s) => s.setSelectedId);

  useEffect(() => {
    void loadAccidents();
  }, [loadAccidents]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const { center: c, level: lv } = useMapStore.getState();
    const map = L.map(el, {
      zoomControl: true,
      scrollWheelZoom: true,
      // 휠 한 번에 1 단계가 아니라 0.25 단계씩 이동시켜 카카오맵처럼 부드럽게.
      wheelPxPerZoomLevel: 60,
      wheelDebounceTime: 30,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      inertia: true,
      inertiaDeceleration: 2400,
      inertiaMaxSpeed: 1800,
      easeLinearity: 0.18,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      bounceAtZoomLimits: false,
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 18,
    }).setView(
      [c.lat, c.lng],
      resolveLeafletZoom(lv, Boolean(useMapStore.getState().selectedAccident))
    );
    // 세계 지도는 각 나라 모국어가 아닌 영어 라벨로 통일.
    // ESRI World Street Map: 무료 + API 키 불필요 + 국가/도시/주요 지명 모두 영문 표기.
    // (OpenStreetMap 표준 타일은 `name` 태그를 그대로 써서 한자/키릴/한글 등 현지 표기로 나옴)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        // ESRI 측에서 가끔 일부 타일이 비어 올 때를 대비.
        crossOrigin: true,
      }
    ).addTo(map);
    L.control
      .scale({ imperial: false, metric: true, maxWidth: 140, position: "bottomleft" })
      .addTo(map);
    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    disasterLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      const p = { lat: e.latlng.lat, lng: e.latlng.lng };
      setCenter(p);
      selectPoint(p);
      openForm();
    });

    // 사용자가 지도를 옮기면 store 의 center 와 실제 지도 center 가 어긋나
    // 같은 위치를 다시 검색해도 panTo 가 트리거되지 않는다. 결과를 store 에 반영.
    map.on("moveend", () => {
      const c = map.getCenter();
      const cur = useMapStore.getState().center;
      if (
        Math.abs(cur.lat - c.lat) < 1e-7 &&
        Math.abs(cur.lng - c.lng) < 1e-7
      ) {
        return;
      }
      useMapStore.getState().syncCenterFromMap({ lat: c.lat, lng: c.lng });
    });

    // 사용자가 휠/버튼으로 줌하면 store 의 level 도 따라가야 한다.
    // 그렇지 않으면 다른 액션(중심 이동 등)으로 setView 가 다시 호출될 때 옛 zoom 으로 되돌아간다.
    map.on("zoomend", () => {
      const z = map.getZoom();
      const cur = useMapStore.getState().level;
      if (Math.abs(cur - z) < 0.01) return;
      useMapStore.getState().setLevel(z);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      disasterLayerRef.current = null;
    };
  }, [openForm, selectPoint, setCenter]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const list = Array.isArray(accidents) ? accidents : [];
    for (const a of list) {
      if (!a) continue;
      const lat = Number(a.location?.lat);
      const lng = Number(a.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const meta = getAccidentCategoryMeta(a.category);
      const mk = L.circleMarker([lat, lng], {
        radius: 6,
        weight: 2,
        color: "#fff",
        fillColor: meta.color,
        fillOpacity: 0.95,
      });
      mk.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        selectAccident(a);
      });
      mk.addTo(layer);
    }
  }, [accidents, selectAccident]);

  /** 재난 대피시설(지진해일·옥외대피소) — 카카오 맵과 동일 store, Leaflet 에만 마커 미구현돼 있던 공백 보완 */
  useEffect(() => {
    const layer = disasterLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!tsVisible) return;
    for (const it of tsItems) {
      if (!it) continue;
      const lat = Number(it.latitude);
      const lng = Number(it.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const mk = L.circleMarker([lat, lng], {
        radius: 7,
        weight: 2,
        color: "#fff",
        fillColor: "#10b981",
        fillOpacity: 0.92,
      });
      const title =
        it.displayAddress?.trim() ||
        [it.sido, it.sigungu, it.eupmyeondong].filter(Boolean).join(" ") ||
        "대피시설";
      mk.bindPopup(
        `<div style="font-size:12px;line-height:1.35;max-width:220px"><strong style="color:#047857">${escapeHtml(it.sourceName ?? "")}</strong><br/>${escapeHtml(title)}</div>`
      );
      mk.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        tsSetSelectedId(it.id);
      });
      mk.addTo(layer);
    }
  }, [tsVisible, tsItems, tsSetSelectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const z = resolveLeafletZoom(level, Boolean(selectedAccident));
    const sid = selectedAccident?.id;
    const p = prevViewRef.current;
    if (
      p &&
      Math.abs(p.lat - center.lat) < 1e-7 &&
      Math.abs(p.lng - center.lng) < 1e-7 &&
      Math.abs(p.z - z) < 0.01 &&
      p.sel === sid
    ) {
      return;
    }
    prevViewRef.current = { lat: center.lat, lng: center.lng, z, sel: sid };
    // 사고 상세 선택 시에만 부드러운 flyTo 애니메이션. 그 외(휠 줌 결과 sync 등)는 즉시.
    const shouldAnimate =
      sid != null &&
      (!p || p.sel !== sid || p.z !== z || p.lat !== center.lat || p.lng !== center.lng);
    map.setView([center.lat, center.lng], z, {
      animate: shouldAnimate,
      duration: shouldAnimate ? 0.28 : 0,
    });
  }, [center.lat, center.lng, level, selectedAccident]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-slate-100" />;
}
