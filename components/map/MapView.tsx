"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Map } from "react-kakao-maps-sdk";
import KakaoMapLoader from "./KakaoMapLoader";
import AccidentMarker from "./AccidentMarker";
import PublicSafetyMarker from "./PublicSafetyMarker";
import PublicSafetyPopup from "./PublicSafetyPopup";
import { useMapStore } from "@/hooks/useMapStore";
import { usePublicSafetyStore } from "@/hooks/usePublicSafetyStore";

export default function MapView() {
  const center = useMapStore((s) => s.center);
  const level = useMapStore((s) => s.level);
  const accidents = useMapStore((s) => s.accidents);
  const selectPoint = useMapStore((s) => s.selectPoint);
  const openForm = useMapStore((s) => s.openForm);
  const selectAccident = useMapStore((s) => s.selectAccident);
  const loadAccidents = useMapStore((s) => s.loadAccidents);
  const setLevel = useMapStore((s) => s.setLevel);
  const syncCenterFromMap = useMapStore((s) => s.syncCenterFromMap);

  // 공공안전(성범죄자 공개·고지 주소) 레이어 — accidents 와 분리된 별도 store.
  const psVisible = usePublicSafetyStore((s) => s.visible);
  const psItemsRaw = usePublicSafetyStore((s) => s.items);
  const psSelectedId = usePublicSafetyStore((s) => s.selectedId);
  const psSetSelectedId = usePublicSafetyStore((s) => s.setSelectedId);
  const psItems = useMemo(
    () => (Array.isArray(psItemsRaw) ? psItemsRaw : []),
    [psItemsRaw]
  );

  /** Map 내부 effect 가 [callback] 을 의존하므로 참조 고정 — 매 렌더마다 바뀌면 onCreate 가 반복 호출되어 무한 루프 */
  const handleZoomChanged = useCallback(
    (map: kakao.maps.Map) => setLevel(map.getLevel()),
    [setLevel]
  );

  /**
   * 사용자가 마우스/터치로 지도를 끌어 옮기면 store 의 center 와 실제 지도 center 가 어긋난다.
   * 이 상태에서 같은 위치를 다시 검색하면 store center 가 동일해 카카오 SDK 의 panTo 가 트리거되지 않는다.
   * 사용자 입력 결과를 store 에 반영해 두면 다음 검색이 항상 정확히 동작한다.
   */
  const handleCenterChanged = useCallback(
    (map: kakao.maps.Map) => {
      const c = map.getCenter();
      syncCenterFromMap({ lat: c.getLat(), lng: c.getLng() });
    },
    [syncCenterFromMap]
  );

  useEffect(() => {
    loadAccidents();
  }, [loadAccidents]);

  // 레이어 OFF 로 전환 시 선택 상태 초기화 → 팝업 자동 닫힘.
  useEffect(() => {
    if (!psVisible && psSelectedId) psSetSelectedId(null);
  }, [psVisible, psSelectedId, psSetSelectedId]);

  const psSelectedItem = useMemo(
    () =>
      psSelectedId ? psItems.find((it) => it.id === psSelectedId) ?? null : null,
    [psItems, psSelectedId]
  );

  // TODO: 마커 수가 많아지면 클러스터링 도입 (kakao.maps.MarkerClusterer 또는 직접 그리드 군집화).
  //       현재는 좌표 보유 캐시 항목만 그대로 그린다.
  return (
    <div className="absolute inset-0">
      <KakaoMapLoader>
        <Map
          center={center}
          level={level}
          isPanto
          style={{ width: "100%", height: "100%" }}
          onZoomChanged={handleZoomChanged}
          onCenterChanged={handleCenterChanged}
          onDragEnd={handleCenterChanged}
          onClick={async (_map, mouseEvent) => {
            // 공공안전 팝업이 떠 있으면 지도 클릭은 팝업 닫기에만 사용.
            if (psSelectedId) {
              psSetSelectedId(null);
              return;
            }
            const latlng = mouseEvent.latLng;
            const point = { lat: latlng.getLat(), lng: latlng.getLng() };
            selectPoint(point);
            openForm();
          }}
        >
          {(Array.isArray(accidents) ? accidents : []).map((a) =>
            a ? (
              <AccidentMarker
                key={a.id}
                accident={a}
                onClick={() => selectAccident(a)}
              />
            ) : null
          )}

          {psVisible &&
            psItems.map((it) =>
              it ? (
                <PublicSafetyMarker
                  key={it.id}
                  item={it}
                  selected={it.id === psSelectedId}
                  onClick={() => psSetSelectedId(it.id)}
                />
              ) : null
            )}

          {psVisible && psSelectedItem && (
            <PublicSafetyPopup
              item={psSelectedItem}
              onClose={() => psSetSelectedId(null)}
            />
          )}
        </Map>
      </KakaoMapLoader>
    </div>
  );
}
