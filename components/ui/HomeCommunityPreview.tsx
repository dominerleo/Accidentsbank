"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
  Flame,
  MapPin,
  Newspaper,
} from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useMapStore } from "@/hooks/useMapStore";
import { ui } from "@/lib/i18n/ui";
import type { Accident } from "@/types";
import type { Post } from "@/types/community";

interface HomePreviewPayload {
  ok: boolean;
  latestReports: Post[];
  popularPosts: Post[];
  todayAccidents: Accident[];
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: typeof Newspaper;
  label: string;
}) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      <Icon className="h-3.5 w-3.5 text-brand" aria-hidden />
      {label}
    </h3>
  );
}

export default function HomeCommunityPreview() {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const focusAccidentOnMap = useMapStore((s) => s.focusAccidentOnMap);

  const [data, setData] = useState<HomePreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch("/api/community/home-preview", {
          cache: "no-store",
        });
        const json = (await res.json()) as HomePreviewPayload;
        if (!cancelled) {
          if (!res.ok || !json.ok) {
            setFailed(true);
            setData(null);
          } else {
            setData(json);
          }
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dateFmt =
    locale === "en"
      ? new Intl.DateTimeFormat("en-US", { dateStyle: "short" })
      : new Intl.DateTimeFormat("ko-KR", { dateStyle: "short" });

  const postLine = (p: Post) => (
    <li key={p.id} className="min-w-0">
      <Link
        href={`/community/post/${p.id}`}
        className="group flex items-start gap-1 rounded-md py-1 text-left text-xs text-slate-800 hover:bg-slate-50"
      >
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-brand" />
        <span className="line-clamp-2 break-words">{p.title}</span>
      </Link>
    </li>
  );

  return (
    <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-5 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
        <Link
          href="/community"
          className="flex min-h-[2.25rem] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-800 shadow-sm hover:border-brand/40 hover:text-brand sm:min-w-[140px]"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {t.homeShortcutCommunity}
        </Link>
        <Link
          href="/community/accident-report/write"
          className="flex min-h-[2.25rem] flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-center text-xs font-semibold text-white shadow-sm hover:bg-brand-dark sm:min-w-[140px]"
        >
          {t.homeShortcutReport}
        </Link>
      </div>

      {loading ? (
        <p className="mt-3 text-[11px] text-slate-400">{t.homePreviewLoading}</p>
      ) : failed ? (
        <p
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900"
          role="status"
        >
          {t.homePreviewError}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <SectionTitle icon={Newspaper} label={t.homeSectionLatestReports} />
            {data?.latestReports?.length ? (
              <ul className="space-y-0.5">{data.latestReports.map(postLine)}</ul>
            ) : (
              <p className="text-[11px] text-slate-400">{t.homePreviewEmpty}</p>
            )}
          </div>

          <div>
            <SectionTitle icon={Flame} label={t.homeSectionPopularPosts} />
            {data?.popularPosts?.length ? (
              <ul className="space-y-0.5">{data.popularPosts.map(postLine)}</ul>
            ) : (
              <p className="text-[11px] text-slate-400">{t.homePreviewEmpty}</p>
            )}
          </div>

          <div>
            <SectionTitle icon={MapPin} label={t.homeSectionTodayIncidents} />
            {data?.todayAccidents?.length ? (
              <ul className="space-y-0.5">
                {data.todayAccidents.map((a) => (
                  <li key={a.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => focusAccidentOnMap(a)}
                      className="group flex w-full items-start gap-1 rounded-md py-1 text-left text-xs text-slate-800 hover:bg-slate-50"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-brand" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 break-words">{a.title}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-400">
                          {dateFmt.format(new Date(a.occurredAt))} ·{" "}
                          {t.homePreviewShowOnMap}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-400">{t.homePreviewEmpty}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
