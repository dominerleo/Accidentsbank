"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { useMapStore } from "@/hooks/useMapStore";
import { useAuth } from "@/hooks/useAuth";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ui } from "@/lib/i18n/ui";
import type { AccidentCategory, AccidentPatch } from "@/types";
import { ACCIDENT_CATEGORIES, accidentCategoryLabel, sourceTypeLabel } from "@/types";
import { formatDate, toDatetimeLocalValue } from "@/lib/utils";

const showDevDelete = process.env.NEXT_PUBLIC_ENABLE_DEV_DELETE === "true";

type FormState = {
  category: AccidentCategory;
  title: string;
  description: string;
  occurredAtLocal: string;
  newsUrl: string;
  roadAddress: string;
  jibunAddress: string;
  region1: string;
  region2: string;
  region3: string;
  lat: string;
  lng: string;
  sourceType: string;
};

function accidentToForm(a: {
  category: AccidentCategory;
  title: string;
  description?: string;
  occurredAt: string;
  newsUrl?: string;
  address: {
    roadAddress?: string;
    jibunAddress?: string;
    region1?: string;
    region2?: string;
    region3?: string;
  };
  location: { lat: number; lng: number };
  sourceType: string;
}): FormState {
  return {
    category: a.category,
    title: a.title,
    description: a.description ?? "",
    occurredAtLocal: toDatetimeLocalValue(a.occurredAt),
    newsUrl: a.newsUrl ?? "",
    roadAddress: a.address.roadAddress ?? "",
    jibunAddress: a.address.jibunAddress ?? "",
    region1: a.address.region1 ?? "",
    region2: a.address.region2 ?? "",
    region3: a.address.region3 ?? "",
    lat: String(a.location.lat),
    lng: String(a.location.lng),
    sourceType: a.sourceType,
  };
}

export default function AccidentDetailModal() {
  const selected = useMapStore((s) => s.selectedAccident);
  const selectAccident = useMapStore((s) => s.selectAccident);
  const deleteAccident = useMapStore((s) => s.deleteAccident);
  const updateAccident = useMapStore((s) => s.updateAccident);
  const purgeAllAccidents = useMapStore((s) => s.purgeAllAccidents);
  const deleting = useMapStore((s) => s.deleting);
  const saving = useMapStore((s) => s.saving);
  const { user } = useAuth();
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const [role, setRole] = useState<string | null>(null);
  const [devSecret, setDevSecret] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [purgeInput, setPurgeInput] = useState("");
  const [purgeOpen, setPurgeOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    const sb = getSupabaseBrowserClient();
    sb.from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setRole(data?.role ?? "user"));
  }, [user]);

  useEffect(() => {
    setEditMode(false);
    setForm(null);
    setErr(null);
    setPurgeOpen(false);
    setPurgeInput("");
  }, [selected?.id]);

  const meta = useMemo(
    () => (selected ? ACCIDENT_CATEGORIES[selected.category] : null),
    [selected]
  );

  if (!selected || !meta) return null;

  const isOwner = Boolean(user?.id && selected.createdBy === user.id);
  const isStaff = role === "admin" || role === "moderator";
  const canDelete = isStaff || isOwner || showDevDelete;
  const canEdit = isStaff || isOwner;

  const startEdit = () => {
    setForm(accidentToForm(selected));
    setEditMode(true);
    setErr(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setForm(null);
    setErr(null);
  };

  const handleSave = async () => {
    if (!form) return;
    setErr(null);
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.title.trim()) {
      setErr(t.detailErrTitleRequired);
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setErr(t.detailErrLatLng);
      return;
    }
    const patch: AccidentPatch = {
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      occurredAt: new Date(form.occurredAtLocal).toISOString(),
      location: { lat, lng },
      address: {
        roadAddress: form.roadAddress.trim() || undefined,
        jibunAddress: form.jibunAddress.trim() || undefined,
        region1: form.region1.trim() || undefined,
        region2: form.region2.trim() || undefined,
        region3: form.region3.trim() || undefined,
      },
      newsUrl: form.newsUrl.trim() || null,
    };
    if (isStaff && form.sourceType.trim()) {
      patch.sourceType = form.sourceType.trim();
    }
    try {
      await updateAccident(selected.id, patch);
      setEditMode(false);
      setForm(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    setErr(null);
    try {
      if (showDevDelete && devSecret.trim()) {
        await deleteAccident(selected.id, { devSecret: devSecret.trim() });
      } else {
        await deleteAccident(selected.id);
      }
      selectAccident(null);
      setDevSecret("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handlePurge = async () => {
    const phrase = t.detailPurgePhrase;
    if (purgeInput.trim() !== phrase) {
      setErr(t.detailPurgeMismatch(phrase));
      return;
    }
    setErr(null);
    try {
      await purgeAllAccidents();
      selectAccident(null);
      setPurgeOpen(false);
      setPurgeInput("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={() => selectAccident(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <h3 className="min-w-0 flex-1 pr-2 text-base font-bold text-slate-900 line-clamp-2">
            {editMode && form ? form.title : selected.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && !editMode && (
              <button
                type="button"
                onClick={startEdit}
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                aria-label={t.detailAriaEdit}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {editMode && (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  {t.detailCancel}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-1 rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? t.detailSaving : t.detailSave}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => selectAccident(null)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label={t.detailCloseAria}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4 text-sm text-slate-700">
          {editMode && form ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600">
                {t.detailCategory}
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, category: e.target.value as AccidentCategory } : f
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {(Object.keys(ACCIDENT_CATEGORIES) as AccidentCategory[]).map((k) => (
                    <option key={k} value={k}>
                      {accidentCategoryLabel(k, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                {t.detailTitle}
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                {t.detailOccurred}
                <input
                  type="datetime-local"
                  value={form.occurredAtLocal}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, occurredAtLocal: e.target.value } : f))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                {t.detailDesc}
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, description: e.target.value } : f))
                  }
                  rows={4}
                  className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-medium text-slate-600">
                  {t.detailLat}
                  <input
                    value={form.lat}
                    onChange={(e) => setForm((f) => (f ? { ...f, lat: e.target.value } : f))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  {t.detailLng}
                  <input
                    value={form.lng}
                    onChange={(e) => setForm((f) => (f ? { ...f, lng: e.target.value } : f))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-600">
                {t.detailRoad}
                <input
                  value={form.roadAddress}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, roadAddress: e.target.value } : f))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                {t.detailJibun}
                <input
                  value={form.jibunAddress}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, jibunAddress: e.target.value } : f))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["region1", "region2", "region3"] as const).map((k) => (
                  <label key={k} className="block text-xs font-medium text-slate-600">
                    {k === "region1"
                      ? t.detailRegion1
                      : k === "region2"
                        ? t.detailRegion2
                        : t.detailRegion3}
                    <input
                      value={form[k]}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, [k]: e.target.value } : f))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
              <label className="block text-xs font-medium text-slate-600">
                {t.detailNewsUrl}
                <input
                  value={form.newsUrl}
                  onChange={(e) => setForm((f) => (f ? { ...f, newsUrl: e.target.value } : f))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              {isStaff && (
                <label className="block text-xs font-medium text-slate-600">
                  {t.detailSourceAdmin}
                  <input
                    value={form.sourceType}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, sourceType: e.target.value } : f))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder={t.detailSourcePh}
                  />
                </label>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="rounded-full px-2 py-0.5 font-medium text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {accidentCategoryLabel(selected.category, locale)}
                </span>
                <span className="text-slate-500">{formatDate(selected.occurredAt)}</span>
                <span className="text-slate-400">
                  · {sourceTypeLabel(selected.sourceType, locale)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {selected.address.roadAddress ??
                  selected.address.jibunAddress ??
                  t.detailNoAddress}
              </p>
              {selected.description && (
                <p className="whitespace-pre-wrap text-slate-800">{selected.description}</p>
              )}
              {selected.newsUrl && (
                <a
                  href={selected.newsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand underline"
                >
                  {t.detailOpenNews}
                </a>
              )}
            </>
          )}

          {showDevDelete && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="mb-2 font-semibold">{t.detailDevTitle}</p>
              <p className="mb-2 text-amber-800">{t.detailDevBody}</p>
              <input
                type="password"
                placeholder="ADMIN_DELETE_SECRET"
                value={devSecret}
                onChange={(e) => setDevSecret(e.target.value)}
                className="mb-2 w-full rounded border border-amber-300 px-2 py-1.5 text-slate-900"
              />
            </div>
          )}

          {isStaff && (
            <div className="rounded-lg border border-red-100 bg-red-50/80 p-3 text-xs text-red-900">
              <button
                type="button"
                onClick={() => setPurgeOpen((o) => !o)}
                className="font-semibold text-red-800 underline-offset-2 hover:underline"
              >
                {t.detailPurgeLink}
              </button>
              {purgeOpen && (
                <div className="mt-2 space-y-2 border-t border-red-200 pt-2">
                  <p className="text-red-800">
                    {t.detailPurgeIntro}{" "}
                    <strong>{t.detailPurgePhrase}</strong> {t.detailPurgeOutro}
                  </p>
                  <input
                    value={purgeInput}
                    onChange={(e) => setPurgeInput(e.target.value)}
                    placeholder={t.detailPurgePhrase}
                    className="w-full rounded border border-red-200 px-2 py-1.5 text-slate-900"
                  />
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handlePurge}
                    className="w-full rounded border border-red-300 bg-white py-1.5 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleting ? t.detailPurgeDeleting : t.detailPurgeRun}
                  </button>
                </div>
              )}
            </div>
          )}

          {err && (
            <p className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-600">{err}</p>
          )}

          {canDelete && !editMode && (
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={
                  deleting || (showDevDelete && !isStaff && !isOwner && !devSecret.trim())
                }
                onClick={handleDelete}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? t.detailDeleteDeleting : t.detailDelete}
              </button>
              {!isStaff && !isOwner && showDevDelete && (
                <p className="mt-1 text-center text-[11px] text-slate-500">
                  {t.detailDeleteHint}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
