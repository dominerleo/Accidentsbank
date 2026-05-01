"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface UseAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** 카카오 OAuth 로그인 시작 */
  signInWithKakao: () => Promise<void>;
  /** 이메일/비밀번호 로그인 (선택 기능) */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** 이메일/비밀번호 가입 (선택 기능) */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  /** 로그아웃 */
  signOut: () => Promise<void>;
}

/**
 * 클라이언트 컴포넌트 전용 인증 훅.
 *
 * - 마운트 시 현재 세션을 1회 조회.
 * - onAuthStateChange 구독으로 토큰 갱신/로그인/로그아웃을 실시간 반영.
 */
export function useAuth(): UseAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithKakao = async () => {
    const supabase = getSupabaseBrowserClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "/auth/callback";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo },
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    session,
    loading,
    signInWithKakao,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
