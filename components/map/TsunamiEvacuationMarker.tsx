"use client";

import { CustomOverlayMap } from "react-kakao-maps-sdk";
import type { TsunamiEvacuationItem } from "@/hooks/useTsunamiEvacuationStore";

interface Props {
  item: TsunamiEvacuationItem;
  selected: boolean;
  onClick: (item: TsunamiEvacuationItem) => void;
}

/**
 * 지진해일 대피지구 마커.
 *
 * 디자인:
 *   - 성범죄자 보라색 마름모와 시각적으로 분리.
 *   - "기타: 대피/안전" 의미를 살려 emerald(녹색) 원형으로 표시.
 *   - 표시 정보는 시설명·주소만. 개인정보 없음.
 */
export default function TsunamiEvacuationMarker({
  item,
  selected,
  onClick,
}: Props) {
  if (!item) return null;
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const px = 14;
  const title = item.displayAddress ?? "";
  return (
    <CustomOverlayMap
      position={{ lat, lng }}
      yAnchor={1}
      zIndex={selected ? 4 : 2}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(item);
        }}
        title={title}
        aria-label={title}
        className="rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
        style={{
          backgroundColor: "#10b981",
          width: px,
          height: px,
          marginLeft: -px / 2,
          marginTop: -px,
          boxShadow: selected
            ? "0 0 0 4px rgba(110, 231, 183, 0.85), 0 2px 8px rgba(0,0,0,0.25)"
            : "0 2px 6px rgba(0,0,0,0.2)",
        }}
      />
    </CustomOverlayMap>
  );
}
