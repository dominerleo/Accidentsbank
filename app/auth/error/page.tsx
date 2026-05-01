import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface Props {
  searchParams: Promise<{ message?: string }>;
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-10 shadow-lg">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">로그인 실패</h1>
        <p className="max-w-sm text-center text-sm text-slate-600">
          {message ?? "알 수 없는 오류가 발생했습니다."}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
