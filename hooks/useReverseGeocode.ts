"use client";

import { useCallback, useState } from "react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import type { AccidentAddress, LatLng } from "@/types";

export function useReverseGeocode() {
  const locale = useLocaleStore((s) => s.locale);
  const [address, setAddress] = useState<AccidentAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(
    async (coord: LatLng) => {
      setLoading(true);
      setError(null);
      try {
        const qs =
          locale === "en"
            ? `lat=${coord.lat}&lng=${coord.lng}&source=osm`
            : `lat=${coord.lat}&lng=${coord.lng}`;
        const res = await fetch(`/api/geocode?${qs}`, { cache: "no-store" });
        const te = ui(locale);
        if (!res.ok) throw new Error(te.geocodeFailed(res.status));
        const data = (await res.json()) as AccidentAddress;
        setAddress(data);
        return data;
      } catch (e) {
        const te = ui(locale);
        const msg = e instanceof Error ? e.message : te.errorUnknown;
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locale]
  );

  return { address, loading, error, resolve };
}
