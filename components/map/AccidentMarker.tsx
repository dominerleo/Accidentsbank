"use client";

import { CustomOverlayMap } from "react-kakao-maps-sdk";
import {
  Car,
  Shield,
  Flame,
  AlertTriangle,
  CloudLightning,
  Circle,
  type LucideIcon,
} from "lucide-react";
import type { Accident, AccidentCategory } from "@/types";
import { ACCIDENT_CATEGORIES } from "@/types";

const ICONS: Record<AccidentCategory, LucideIcon> = {
  traffic: Car,
  crime: Shield,
  fire: Flame,
  fraud: AlertTriangle,
  disaster: CloudLightning,
  etc: Circle,
};

interface Props {
  accident: Accident;
  onClick?: (a: Accident) => void;
}

export default function AccidentMarker({ accident, onClick }: Props) {
  const Icon = ICONS[accident.category];
  const meta = ACCIDENT_CATEGORIES[accident.category];

  return (
    <CustomOverlayMap position={accident.location} yAnchor={1}>
      <button
        type="button"
        onClick={() => onClick?.(accident)}
        className="group relative flex h-10 w-10 -translate-y-2 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110"
        style={{ backgroundColor: meta.color }}
        title={`${meta.label} · ${accident.title}`}
      >
        <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
      </button>
    </CustomOverlayMap>
  );
}
