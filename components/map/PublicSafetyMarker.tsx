"use client";

import { CustomOverlayMap } from "react-kakao-maps-sdk";
import type { PublicSafetyAddressItem } from "@/hooks/usePublicSafetyStore";

interface Props {
  item: PublicSafetyAddressItem;
  selected: boolean;
  onClick: (item: PublicSafetyAddressItem) => void;
}

/**
 * 카카오맵 위 공공안전(성범죄자 공개·고지 주소) 마커.
 *
 * 디자인 원칙:
 *   - 사고(Accident) 마커와 시각적으로 분리: 진한 보라색·다른 모양(테두리 강조)
 *   - 개인정보는 아무 것도 표시하지 않음 (이름·사진·범죄내용 X).
 */
export default function PublicSafetyMarker({ item, selected, onClick }: Props) {
  const px = 14;
  if (!item) return null;
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
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
        className="rounded-sm border-2 border-white shadow-md transition-transform hover:scale-110"
        style={{
          backgroundColor: "#7c3aed",
          width: px,
          height: px,
          marginLeft: -px / 2,
          marginTop: -px,
          boxShadow: selected
            ? "0 0 0 4px rgba(167, 139, 250, 0.85), 0 2px 8px rgba(0,0,0,0.25)"
            : "0 2px 6px rgba(0,0,0,0.2)",
          transform: "rotate(45deg)",
        }}
      />
    </CustomOverlayMap>
  );
}
