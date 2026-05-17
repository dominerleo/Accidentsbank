"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useAuth } from "@/hooks/useAuth";
import { ui } from "@/lib/i18n/ui";
import { communityFetchJson } from "@/lib/community/api";
import LoginGateBanner from "@/components/community/LoginGateBanner";
import type { Post } from "@/types/community";

export default function WritePostPage() {
  const params = useParams();
  const router = useRouter();
  const boardSlug =
    typeof params.boardSlug === "string"
      ? params.boardSlug
      : Array.isArray(params.boardSlug)
        ? params.boardSlug[0]
        : "";

  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [region, setRegion] = useState("");
  const [locationText, setLocationText] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginBanner, setLoginBanner] = useState(false);

  const requireLogin = () => {
    if (!user) {
      setLoginBanner(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireLogin()) return;
    setError(null);
    const latRaw = latitude.trim();
    const lngRaw = longitude.trim();
    let lat: number | null = null;
    let lng: number | null = null;
    if (latRaw || lngRaw) {
      lat = Number(latRaw);
      lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setError(t.detailErrLatLng);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        boardSlug,
        title: title.trim(),
        content: content.trim() || null,
        status: "published",
        region: region.trim() || undefined,
        locationText: locationText.trim() || undefined,
      };
      if (lat !== null && lng !== null) {
        payload.latitude = lat;
        payload.longitude = lng;
      }

      const res = await communityFetchJson<{ post: Post }>("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.push(`/community/post/${res.post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <p className="text-sm text-slate-500">{t.authSessionLoading}</p>;
  }

  return (
    <>
      <LoginGateBanner
        locale={locale}
        message={loginBanner ? t.communityLoginRequired : null}
        onDismiss={() => setLoginBanner(false)}
      />
      <div className="space-y-6">
        <div>
          <Link
            href={`/community/${encodeURIComponent(boardSlug)}`}
            className="text-xs font-medium text-slate-500 hover:text-brand"
          >
            ← {t.communityPostsTitle}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {t.communityWrite}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {t.communityTitleLabel}
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {t.communityContentLabel}
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {t.communityRegion}
            </span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {t.communityLocationText}
            </span>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-slate-700">
              {t.communityCoords}
            </span>
            <p className="mb-2 text-xs text-slate-500">{t.communityCoordsHint}</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder={t.communityLatPh}
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder={t.communityLngPh}
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? t.communitySubmitting : t.communitySubmit}
            </button>
            <Link
              href={`/community/${encodeURIComponent(boardSlug)}`}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.communityCancel}
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
