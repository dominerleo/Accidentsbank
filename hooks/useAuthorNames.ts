"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useAuthorNames(userIds: string[]): Map<string, string> {
  const [map, setMap] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (ids.length === 0) {
      setMap(new Map());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabaseBrowserClient();
        const { data, error } = await sb
          .from("profiles")
          .select("id, username")
          .in("id", ids);
        if (error || cancelled) return;
        const next = new Map<string, string>();
        for (const row of data ?? []) {
          if (row.id && row.username) next.set(row.id, row.username);
        }
        setMap(next);
      } catch {
        /* env */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userIds.slice().sort().join("|")]);

  return map;
}
