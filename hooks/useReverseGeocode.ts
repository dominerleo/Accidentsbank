"use client";

import { useCallback, useState } from "react";
import type { AccidentAddress, LatLng } from "@/types";

export function useReverseGeocode() {
  const [address, setAddress] = useState<AccidentAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (coord: LatLng) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/geocode?lat=${coord.lat}&lng=${coord.lng}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
      const data = (await res.json()) as AccidentAddress;
      setAddress(data);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { address, loading, error, resolve };
}
