"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";
import { communityFetchJson } from "@/lib/community/api";
import { pickI18nText } from "@/types/community";
import type { Board } from "@/types/community";

export default function CommunityHomePage() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await communityFetchJson<{ boards: Board[] }>(
          "/api/boards"
        );
        if (!cancelled) {
          setBoards(data.boards);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.communityLoadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t.communityLoadError]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.communityHomeTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t.communityHomeSub}</p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← {t.communityBackMap}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t.communityLoading}</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/community/${encodeURIComponent(b.slug)}`}
                className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {pickI18nText(b.nameI18n, locale, b.slug)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {pickI18nText(b.descriptionI18n, locale, "")}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
