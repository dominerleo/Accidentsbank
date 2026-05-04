"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useMapStore } from "@/hooks/useMapStore";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { ui } from "@/lib/i18n/ui";
import type { AccidentCategory, AccidentInput } from "@/types";
import { ACCIDENT_CATEGORIES, accidentCategoryLabel } from "@/types";

interface Props {
  onClose: () => void;
}

export default function AccidentForm({ onClose }: Props) {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const selectedPoint = useMapStore((s) => s.selectedPoint);
  const createAccident = useMapStore((s) => s.createAccident);
  const saving = useMapStore((s) => s.saving);
  const { address, loading, resolve } = useReverseGeocode();

  const [category, setCategory] = useState<AccidentCategory>("incident");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newsUrl, setNewsUrl] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPoint) return;
    void resolve(selectedPoint);
  }, [selectedPoint, resolve]);

  const disabled = !selectedPoint || !title.trim() || saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint) return;
    setSubmitError(null);

    const input: AccidentInput = {
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      occurredAt,
      location: selectedPoint,
      address: address ?? {},
      newsUrl: newsUrl.trim() || undefined,
    };

    try {
      await createAccident(input);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{t.formTitle}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100"
          aria-label={t.formClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <section className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        {selectedPoint ? (
          <>
            <div className="font-semibold text-slate-700">
              {loading
                ? t.formAddrLoading
                : address?.roadAddress ??
                  address?.jibunAddress ??
                  t.formAddrUnknown}
            </div>
            <div className="mt-0.5 text-slate-400">
              {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
            </div>
          </>
        ) : (
          <span className="text-slate-400">{t.formPickLocation}</span>
        )}
      </section>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700">
          {t.formCategoryLabel}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ACCIDENT_CATEGORIES) as AccidentCategory[]).map((k) => {
            const active = category === k;
            const color = ACCIDENT_CATEGORIES[k].color;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setCategory(k)}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-transparent text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                style={active ? { backgroundColor: color } : undefined}
              >
                {accidentCategoryLabel(k, locale)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-xs font-semibold text-slate-700">
          {t.formTitleLabel}
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.formTitlePh}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="occurredAt"
          className="text-xs font-semibold text-slate-700"
        >
          {t.formDateLabel}
        </label>
        <input
          id="occurredAt"
          type="date"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-xs font-semibold text-slate-700"
        >
          {t.formDescLabel}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t.formDescPh}
          className="resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newsUrl" className="text-xs font-semibold text-slate-700">
          {t.formNewsLabel}
        </label>
        <input
          id="newsUrl"
          type="url"
          value={newsUrl}
          onChange={(e) => setNewsUrl(e.target.value)}
          placeholder="https://..."
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {saving ? t.formSaving : t.formSave}
      </button>
    </form>
  );
}
