"use client";

import { X } from "lucide-react";
import { ui } from "@/lib/i18n/ui";
import type { AppLocale } from "@/types/locale";

export default function LoginGateBanner({
  locale,
  message,
  onDismiss,
}: {
  locale: AppLocale;
  message: string | null;
  onDismiss: () => void;
}) {
  const t = ui(locale);
  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg"
    >
      <div className="flex gap-2">
        <p className="flex-1">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 hover:bg-amber-100"
          aria-label={t.authCloseAria}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
