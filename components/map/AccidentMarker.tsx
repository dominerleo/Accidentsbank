"use client";

import { CustomOverlayMap } from "react-kakao-maps-sdk";
import type { Accident } from "@/types";
import { ACCIDENT_CATEGORIES } from "@/types";
import { useMapStore } from "@/hooks/useMapStore";
import { dotDiameterPx } from "@/lib/map/markerScale";

interface Props {
  accident: Accident;
  onClick?: (a: Accident) => void;
}

export default function AccidentMarker({ accident, onClick }: Props) {
  const mapLevel = useMapStore((s) => s.level);
  const selectedId = useMapStore((s) => s.selectedAccident?.id);
  const meta = ACCIDENT_CATEGORIES[accident.category];
  const px = dotDiameterPx(mapLevel);
  const isSelected = selectedId === accident.id;

  return (
    <CustomOverlayMap position={accident.location} yAnchor={1}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(accident);
        }}
        className="rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
        style={{
          backgroundColor: meta.color,
          width: px,
          height: px,
          marginLeft: -px / 2,
          marginTop: -px,
          boxShadow: isSelected
            ? "0 0 0 4px rgba(56, 189, 248, 0.95), 0 2px 8px rgba(0,0,0,0.25)"
            : "0 2px 6px rgba(0,0,0,0.2)",
        }}
        title={`${meta.label} · ${accident.title}`}
      />
    </CustomOverlayMap>
  );
}
