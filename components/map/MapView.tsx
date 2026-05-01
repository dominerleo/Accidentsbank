"use client";

import { useEffect } from "react";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import KakaoMapLoader from "./KakaoMapLoader";
import { useMapStore } from "@/hooks/useMapStore";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { ACCIDENT_CATEGORIES } from "@/types";

export default function MapView() {
  const center = useMapStore((s) => s.center);
  const level = useMapStore((s) => s.level);
  const accidents = useMapStore((s) => s.accidents);
  const selectPoint = useMapStore((s) => s.selectPoint);
  const openForm = useMapStore((s) => s.openForm);
  const selectAccident = useMapStore((s) => s.selectAccident);
  const loadAccidents = useMapStore((s) => s.loadAccidents);
  const { resolve } = useReverseGeocode();

  // 첫 마운트 시 사고 목록 로드.
  useEffect(() => {
    loadAccidents();
  }, [loadAccidents]);

  return (
    <div className="absolute inset-0">
      <KakaoMapLoader>
        <Map
          center={center}
          level={level}
          style={{ width: "100%", height: "100%" }}
          onClick={async (_map, mouseEvent) => {
            const latlng = mouseEvent.latLng;
            const point = { lat: latlng.getLat(), lng: latlng.getLng() };
            selectPoint(point);
            openForm();
            await resolve(point);
          }}
        >
          {accidents.map((a) => (
            <MapMarker
              key={a.id}
              position={a.location}
              onClick={() => selectAccident(a)}
              title={`[${ACCIDENT_CATEGORIES[a.category].label}] ${a.title}`}
            />
          ))}
        </Map>
      </KakaoMapLoader>
    </div>
  );
}
