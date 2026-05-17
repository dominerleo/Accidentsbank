"use client";

import { useCallback, useEffect } from "react";
import { Map } from "react-kakao-maps-sdk";
import KakaoMapLoader from "./KakaoMapLoader";
import AccidentMarker from "./AccidentMarker";
import { useMapStore } from "@/hooks/useMapStore";

export default function MapView() {
  const center = useMapStore((s) => s.center);
  const level = useMapStore((s) => s.level);
  const accidents = useMapStore((s) => s.accidents);
  const selectPoint = useMapStore((s) => s.selectPoint);
  const openForm = useMapStore((s) => s.openForm);
  const selectAccident = useMapStore((s) => s.selectAccident);
  const loadAccidents = useMapStore((s) => s.loadAccidents);
  const setLevel = useMapStore((s) => s.setLevel);

  /** Map 내부 effect 가 [callback] 을 의존하므로 참조 고정 — 매 렌더마다 바뀌면 onCreate 가 반복 호출되어 무한 루프 */
  const handleZoomChanged = useCallback(
    (map: kakao.maps.Map) => setLevel(map.getLevel()),
    [setLevel]
  );

  useEffect(() => {
    loadAccidents();
  }, [loadAccidents]);

  return (
    <div className="absolute inset-0">
      <KakaoMapLoader>
        <Map
          center={center}
          level={level}
          isPanto
          style={{ width: "100%", height: "100%" }}
          onZoomChanged={handleZoomChanged}
          onClick={async (_map, mouseEvent) => {
            const latlng = mouseEvent.latLng;
            const point = { lat: latlng.getLat(), lng: latlng.getLng() };
            selectPoint(point);
            openForm();
          }}
        >
          {accidents.map((a) => (
            <AccidentMarker
              key={a.id}
              accident={a}
              onClick={() => selectAccident(a)}
            />
          ))}
        </Map>
      </KakaoMapLoader>
    </div>
  );
}
