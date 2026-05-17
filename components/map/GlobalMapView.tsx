"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapStore } from "@/hooks/useMapStore";
import { ACCIDENT_CATEGORIES } from "@/types";

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
    for (const a of accidents) {
      const mk = L.circleMarker([a.location.lat, a.location.lng], {
        radius: 6,
        weight: 2,
        color: "#fff",
        fillColor: ACCIDENT_CATEGORIES[a.category].color,
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
