"use client";

import { useState } from "react";
import { LogIn, LogOut, User as UserIcon, X, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * 사이드바 헤더용 인증 버튼.
 *
 * - 로그아웃 상태: "로그인" 버튼 → 모달 (카카오 / 이메일)
 * - 로그인 상태: 사용자 닉네임/이메일 + 로그아웃 버튼
 */
export default function AuthButton() {
  const {
    user,
    loading,
    signInWithKakao,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="text-xs text-slate-400">세션 확인 중…</div>
    );
  }

  if (user) {
    const name =
      (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.preferred_username as string | undefined) ??
      user.email ??
      "사용자";
    return (
      <div className="flex items-center gap-2 text-xs">
        <UserIcon className="h-4 w-4 text-slate-500" />
        <span className="max-w-[120px] truncate font-medium text-slate-700">
          {name}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await signOut();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
          className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100"
          aria-label="로그아웃"
        >
          <LogOut className="h-3.5 w-3.5" />
          로그아웃
        </button>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      setOpen(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <LogIn className="h-3.5 w-3.5" />
        로그인
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                사고은행 로그인
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  await signInWithKakao();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#3C1E1E] transition-opacity hover:opacity-90"
            >
              <span aria-hidden>💬</span>
              카카오로 시작
            </button>

            <div className="my-4 flex items-center gap-2 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              또는
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 focus-within:border-brand">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="비밀번호 (6자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:bg-slate-300"
              >
                {submitting
                  ? "처리 중…"
                  : mode === "signin"
                    ? "이메일 로그인"
                    : "이메일 가입"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "signin" ? "signup" : "signin"));
                  setError(null);
                }}
                className="text-center text-xs text-slate-500 underline-offset-2 hover:underline"
              >
                {mode === "signin"
                  ? "처음이신가요? 가입하기"
                  : "이미 계정이 있나요? 로그인"}
              </button>
            </form>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
