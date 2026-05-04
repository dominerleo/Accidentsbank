"use client";

// TODO(public-safety): 영어/Leaflet 모드용 공공안전(성범죄자 공개·고지 주소) 레이어 미구현.
//   - 카카오 맵(`MapView.tsx`) 에 동일 데이터(`/api/public-safety/address-cache`)를
//     사용하는 마커/팝업/토글이 이미 추가되어 있으니 동일한 store(`usePublicSafetyStore`)를
//     재사용해 Leaflet `LayerGroup` 으로 옮겨오면 된다.
//   - 마커 수가 많아질 가능성이 있으므로 도입 시 `leaflet.markercluster` 등의 클러스터링을 함께 검토.

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapStore } from "@/hooks/useMapStore";
import { getAccidentCategoryMeta } from "@/types";

function levelToLeafletZoom(level: number, detail: boolean): number {
  if (detail) return 13;
  return Math.min(16, Math.max(2, Math.round(20 - level * 0.85)));
}

export default function GlobalMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
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
      wheelPxPerZoomLevel: 90,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      inertia: true,
      inertiaDeceleration: 2800,
      inertiaMaxSpeed: 1200,
      easeLinearity: 0.22,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      bounceAtZoomLimits: false,
    }).setView(
      [c.lat, c.lng],
      levelToLeafletZoom(lv, Boolean(useMapStore.getState().selectedAccident))
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control
      .scale({ imperial: false, metric: true, maxWidth: 140, position: "bottomleft" })
      .addTo(map);
    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      const p = { lat: e.latlng.lat, lng: e.latlng.lng };
      setCenter(p);
      selectPoint(p);
      openForm();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const z = levelToLeafletZoom(level, Boolean(selectedAccident));
    const sid = selectedAccident?.id;
    const p = prevViewRef.current;
    if (
      p &&
      p.lat === center.lat &&
      p.lng === center.lng &&
      p.z === z &&
      p.sel === sid
    ) {
      return;
    }
    prevViewRef.current = { lat: center.lat, lng: center.lng, z, sel: sid };
    const shouldAnimate =
      sid != null && (!p || p.sel !== sid || p.z !== z || p.lat !== center.lat || p.lng !== center.lng);
    map.setView([center.lat, center.lng], z, {
      animate: shouldAnimate,
      duration: shouldAnimate ? 0.28 : 0,
    });
  }, [center.lat, center.lng, level, selectedAccident]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-slate-100" />;
}
