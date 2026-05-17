"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ThumbsDown, ThumbsUp, Flag } from "lucide-react";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useAuth } from "@/hooks/useAuth";
import { useAuthorNames } from "@/hooks/useAuthorNames";
import { ui } from "@/lib/i18n/ui";
import { communityFetchJson } from "@/lib/community/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import LoginGateBanner from "@/components/community/LoginGateBanner";
import { pickI18nText } from "@/types/community";
import type { Board, Comment, Post } from "@/types/community";

function viewCount(meta: Record<string, unknown>): number {
  const n = Number(meta.views ?? meta.viewCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function PostDetailPage() {
  const params = useParams();
  const postId =
    typeof params.postId === "string"
      ? params.postId
      : Array.isArray(params.postId)
        ? params.postId[0]
        : "";

  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);
  const { user, loading: authLoading } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [boardLabel, setBoardLabel] = useState("");
  const [boardSlug, setBoardSlug] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [myVote, setMyVote] = useState<-1 | 1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetail, setReportDetail] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [loginBanner, setLoginBanner] = useState(false);

  const reloadPost = useCallback(async () => {
    const data = await communityFetchJson<{ post: Post }>(
      `/api/posts/${encodeURIComponent(postId)}`
    );
    setPost(data.post);
  }, [postId]);

  const reloadComments = useCallback(async () => {
    const data = await communityFetchJson<{ comments: Comment[] }>(
      `/api/posts/${encodeURIComponent(postId)}/comments`
    );
    setComments(data.comments);
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [postRes, boardsRes] = await Promise.all([
          communityFetchJson<{ post: Post }>(
            `/api/posts/${encodeURIComponent(postId)}`
          ),
          communityFetchJson<{ boards: Board[] }>("/api/boards"),
        ]);
        if (cancelled) return;
        setPost(postRes.post);
        const b = boardsRes.boards.find(
          (x) => x.id === postRes.post.boardId
        );
        if (b) {
          setBoardLabel(pickI18nText(b.nameI18n, locale, b.slug));
          setBoardSlug(b.slug);
        } else {
          setBoardLabel("");
          setBoardSlug("");
        }
        await reloadComments();
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
  }, [postId, locale, reloadComments, t.communityLoadError]);

  useEffect(() => {
    if (!user || !postId) {
      setMyVote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabaseBrowserClient();
        const { data } = await sb
          .from("post_votes")
          .select("value")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled || !data) {
          if (!cancelled) setMyVote(null);
          return;
        }
        const v = Number(data.value);
        setMyVote(v === -1 ? -1 : 1);
      } catch {
        if (!cancelled) setMyVote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, postId]);

  const commentAuthorIds = comments.map((c) => c.authorId);
  const commentAuthors = useAuthorNames(commentAuthorIds);

  const meta = (post?.metadata ?? {}) as Record<string, unknown>;
  const regionStr = typeof meta.region === "string" ? meta.region : "";
  const locationStr =
    typeof meta.location_text === "string" ? meta.location_text : "";

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setLoginBanner(true);
      return;
    }
    const text = commentBody.trim();
    if (!text) return;
    setCommentBusy(true);
    try {
      await communityFetchJson(
        `/api/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        }
      );
      setCommentBody("");
      await reloadComments();
      await reloadPost();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setCommentBusy(false);
    }
  };

  const submitVote = async (value: -1 | 1) => {
    if (!user) {
      setLoginBanner(true);
      return;
    }
    setVoteBusy(true);
    try {
      await communityFetchJson(
        `/api/posts/${encodeURIComponent(postId)}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        }
      );
      setMyVote(value);
      await reloadPost();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setVoteBusy(false);
    }
  };

  const submitReport = async () => {
    if (!user) {
      setLoginBanner(true);
      return;
    }
    setReportBusy(true);
    try {
      await communityFetchJson(
        `/api/posts/${encodeURIComponent(postId)}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reasonCode: reportReason,
            detail: reportDetail.trim() || null,
          }),
        }
      );
      setReportOpen(false);
      setReportDetail("");
      await reloadPost();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorUnknown);
    } finally {
      setReportBusy(false);
    }
  };

  if (authLoading || loading) {
    return <p className="text-sm text-slate-500">{t.communityLoading}</p>;
  }

  if (error && !post) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!post) {
    return null;
  }

  const hidden = post.status === "hidden";

  return (
    <>
      <LoginGateBanner
        locale={locale}
        message={loginBanner ? t.communityLoginRequired : null}
        onDismiss={() => setLoginBanner(false)}
      />

      <article className="space-y-6">
        <div>
          <Link
            href={
              boardSlug
                ? `/community/${encodeURIComponent(boardSlug)}`
                : "/community"
            }
            className="text-xs font-medium text-slate-500 hover:text-brand"
          >
            ← {boardLabel || t.communityPostsTitle}
          </Link>
          {boardLabel ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand">
              {boardLabel}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{post.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>
              {t.communityCreatedAt}{" "}
              {new Date(post.createdAt).toLocaleString(
                locale === "en" ? "en-US" : "ko-KR"
              )}
            </span>
            <span>
              {t.communityViews} {viewCount(meta)}
            </span>
            <span>
              {t.communityComments} {post.commentCount}
            </span>
          </div>
        </div>

        {hidden ? (
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
            {t.communityHiddenPost}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {post.body?.trim() ? post.body : "—"}
          </div>

          {(regionStr || locationStr || post.lat != null) && (
            <dl className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
              {regionStr ? (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-slate-500">
                    {t.communityRegion}
                  </dt>
                  <dd className="text-slate-800">{regionStr}</dd>
                </div>
              ) : null}
              {locationStr ? (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-slate-500">
                    {t.communityLocationText}
                  </dt>
                  <dd className="text-slate-800">{locationStr}</dd>
                </div>
              ) : null}
              {post.lat != null && post.lng != null ? (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-slate-500">
                    {t.communityCoords}
                  </dt>
                  <dd className="font-mono text-xs text-slate-700">
                    {post.lat.toFixed(5)}, {post.lng.toFixed(5)}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={voteBusy || hidden}
            onClick={() => submitVote(1)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              myVote === 1
                ? "border-brand bg-brand/10 text-brand"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:opacity-50`}
          >
            <ThumbsUp className="h-4 w-4" />
            {t.communityVoteUp} ({post.likeCount})
          </button>
          <button
            type="button"
            disabled={voteBusy || hidden}
            onClick={() => submitVote(-1)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              myVote === -1
                ? "border-rose-400 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:opacity-50`}
          >
            <ThumbsDown className="h-4 w-4" />
            {t.communityVoteDown} ({post.dislikeCount})
          </button>
          <button
            type="button"
            disabled={hidden}
            onClick={() => {
              if (!user) setLoginBanner(true);
              else setReportOpen((o) => !o);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Flag className="h-4 w-4" />
            {t.communityReport}
          </button>
        </div>

        {reportOpen && user ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm">
            <label className="block">
              <span className="font-medium text-slate-700">
                {t.communityReportReason}
              </span>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <option value="spam">{t.communityReportSpam}</option>
                <option value="abuse">{t.communityReportAbuse}</option>
                <option value="other">{t.communityReportOther}</option>
              </select>
            </label>
            <label className="mt-3 block">
              <span className="font-medium text-slate-700">
                {t.communityReportDetail}
              </span>
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <button
              type="button"
              disabled={reportBusy}
              onClick={() => void submitReport()}
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {reportBusy ? t.communityLoading : t.communityReportSubmit}
            </button>
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.communityComments} ({comments.length})
          </h2>
          <ul className="space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <p className="text-xs font-medium text-slate-600">
                  {commentAuthors.get(c.authorId) ?? t.communityAuthorAnonymous}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{c.body}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleString(
                    locale === "en" ? "en-US" : "ko-KR"
                  )}
                </p>
              </li>
            ))}
          </ul>

          <form onSubmit={submitComment} className="space-y-2">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={t.communityCommentPlaceholder}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
            <button
              type="submit"
              disabled={commentBusy}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {commentBusy ? t.communityLoading : t.communityCommentSubmit}
            </button>
          </form>
        </section>
      </article>
    </>
  );
}
