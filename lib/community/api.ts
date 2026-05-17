/** 클라이언트에서 Route Handler 호출 (세션 쿠키 포함) */
export async function communityFetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = j.error;
    throw new Error(
      typeof err === "string" ? err : `Request failed (${res.status})`
    );
  }
  return j as T;
}
