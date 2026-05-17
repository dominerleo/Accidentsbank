"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Map } from "react-kakao-maps-sdk";
import KakaoMapLoader from "./KakaoMapLoader";
import AccidentMarker from "./AccidentMarker";
import PublicSafetyMarker from "./PublicSafetyMarker";
import PublicSafetyPopup from "./PublicSafetyPopup";
import TsunamiEvacuationMarker from "./TsunamiEvacuationMarker";
import TsunamiEvacuationPopup from "./TsunamiEvacuationPopup";
import { useMapStore } from "@/hooks/useMapStore";
import { usePublicSafetyStore } from "@/hooks/usePublicSafetyStore";
import { useTsunamiEvacuationStore } from "@/hooks/useTsunamiEvacuationStore";

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

  // 지진해일 대피지구 레이어 (기타 카테고리 — 행정안전부 NDMS).
  const tsVisible = useTsunamiEvacuationStore((s) => s.visible);
  const tsItemsRaw = useTsunamiEvacuationStore((s) => s.items);
  const tsSelectedId = useTsunamiEvacuationStore((s) => s.selectedId);
  const tsSetSelectedId = useTsunamiEvacuationStore((s) => s.setSelectedId);
  const tsItems = useMemo(
    () => (Array.isArray(tsItemsRaw) ? tsItemsRaw : []),
    [tsItemsRaw]
  );

  /** Map 내부 effect 가 [callback] 을 의존하므로 참조 고정 — 매 렌더마다 바뀌면 onCreate 가 반복 호출되어 무한 루프 */
  const handleZoomChanged = useCallback(
    (map: kakao.maps.Map) => setLevel(map.getLevel()),
    [setLevel]
  );

  /**
   * 사용자가 마우스/터치로 지도를 "끌어 옮긴" 직후에만 store 동기화.
   * onCenterChanged 는 카카오 SDK 의 `center_changed` 이벤트로 panTo 애니메이션 중에도
   * 수십 번 발생해 자식 마커(공공안전 다량 마커 포함)를 과도하게 재렌더시키므로 사용하지 않는다.
   */
  const handleDragEnd = useCallback(
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

  useEffect(() => {
    if (!tsVisible && tsSelectedId) tsSetSelectedId(null);
  }, [tsVisible, tsSelectedId, tsSetSelectedId]);

  const psSelectedItem = useMemo(
    () =>
      psSelectedId ? psItems.find((it) => it.id === psSelectedId) ?? null : null,
    [psItems, psSelectedId]
  );

  const tsSelectedItem = useMemo(
    () =>
      tsSelectedId ? tsItems.find((it) => it.id === tsSelectedId) ?? null : null,
    [tsItems, tsSelectedId]
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
          onDragEnd={handleDragEnd}
          onClick={async (_map, mouseEvent) => {
            // 공공안전·대피지구 팝업이 떠 있으면 지도 클릭은 팝업 닫기에만 사용.
            if (psSelectedId) {
              psSetSelectedId(null);
              return;
            }
            if (tsSelectedId) {
              tsSetSelectedId(null);
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

          {tsVisible &&
            tsItems.map((it) =>
              it ? (
                <TsunamiEvacuationMarker
                  key={it.id}
                  item={it}
                  selected={it.id === tsSelectedId}
                  onClick={() => tsSetSelectedId(it.id)}
                />
              ) : null
            )}

          {tsVisible && tsSelectedItem && (
            <TsunamiEvacuationPopup
              item={tsSelectedItem}
              onClose={() => tsSetSelectedId(null)}
            />
          )}
        </Map>
      </KakaoMapLoader>
    </div>
  );
}
