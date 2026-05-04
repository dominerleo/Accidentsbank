"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { ui } from "@/lib/i18n/ui";

export function AuthErrorPanel({ message }: { message?: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-10 shadow-lg">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">{t.authErrorTitle}</h1>
        <p className="max-w-sm text-center text-sm text-slate-600">
          {message ?? t.authErrorUnknown}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          {t.authErrorHome}
        </Link>
      </div>
    </main>
  );
}
