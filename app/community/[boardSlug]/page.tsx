"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useAuthorNames } from "@/hooks/useAuthorNames";
import { ui } from "@/lib/i18n/ui";
import { communityFetchJson } from "@/lib/community/api";
import { pickI18nText } from "@/types/community";
import type { Board, PostWithBoard } from "@/types/community";

function viewCount(meta: Record<string, unknown>): number {
  const n = Number(meta.views ?? meta.viewCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function BoardPostsPage() {
  const params = useParams();
  const boardSlug =
    typeof params.boardSlug === "string"
      ? params.boardSlug
      : Array.isArray(params.boardSlug)
        ? params.boardSlug[0]
        : "";

  const locale = useLocaleStore((s) => s.locale);
  const t = ui(locale);

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<PostWithBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardSlug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await communityFetchJson<{
          board: Board;
          posts: PostWithBoard[];
        }>(`/api/boards/${encodeURIComponent(boardSlug)}/posts`);
        if (!cancelled) {
          setBoard(data.board);
          setPosts(data.posts);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.communityLoadError);
          setBoard(null);
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardSlug, t.communityLoadError]);

  const authorIds = posts.map((p) => p.authorId);
  const authorMap = useAuthorNames(authorIds);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/community"
            className="text-xs font-medium text-slate-500 hover:text-brand"
          >
            ← {t.communityBoardList}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {board
              ? pickI18nText(board.nameI18n, locale, board.slug)
              : boardSlug}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t.communityPostsTitle}</p>
        </div>
        <Link
          href={`/community/${encodeURIComponent(boardSlug)}/write`}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-dark"
        >
          {t.communityWrite}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t.communityLoading}</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {t.communityEmptyPosts}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/community/post/${p.id}`}
                className="block px-4 py-4 transition-colors hover:bg-slate-50"
              >
                <p className="font-semibold text-slate-900">{p.title}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    {authorMap.get(p.authorId) ?? t.communityAuthorAnonymous}
                  </span>
                  <span>
                    {t.communityCreatedAt}{" "}
                    {new Date(p.createdAt).toLocaleString(
                      locale === "en" ? "en-US" : "ko-KR"
                    )}
                  </span>
                  <span>
                    {t.communityViews} {viewCount(p.metadata)}
                  </span>
                  <span>
                    {t.communityLikes} {p.likeCount}
                  </span>
                  <span>
                    {t.communityComments} {p.commentCount}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
