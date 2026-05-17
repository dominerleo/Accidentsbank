"use client";

import { useKakaoLoader } from "react-kakao-maps-sdk";
import { KAKAO_APP_KEY } from "@/lib/kakao/config";

interface Props {
  children: React.ReactNode;
}

export default function KakaoMapLoader({ children }: Props) {
  const [loading, error] = useKakaoLoader({
    appkey: KAKAO_APP_KEY,
    libraries: ["clusterer", "drawing", "services"],
  });

  if (!KAKAO_APP_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 p-8 text-center">
        <div>
          <h2 className="mb-2 text-lg font-bold text-slate-800">
            카카오 지도 키가 설정되지 않았습니다
          </h2>
          <p className="text-sm text-slate-600">
            <code className="rounded bg-slate-200 px-1.5 py-0.5">.env.local</code>
            에 <code className="rounded bg-slate-200 px-1.5 py-0.5">NEXT_PUBLIC_KAKAO_APP_KEY</code>
            를 설정해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-8 text-center">
        <div>
          <h2 className="mb-2 text-lg font-bold text-red-800">
            카카오 지도 SDK 로드 실패
          </h2>
          <p className="text-sm text-red-700">
            {error.message ?? "도메인 등록 또는 카카오맵 제품 활성화 상태를 확인해 주세요."}
          </p>
          <p className="mt-2 text-xs text-red-500">
            카카오 Developers 콘솔에서 <code className="rounded bg-red-100 px-1">JavaScript SDK 도메인</code>에
            <code className="ml-1 rounded bg-red-100 px-1">http://localhost:3002</code> 가 등록되어 있는지 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500">지도 불러오는 중...</div>
      </div>
    );
  }

  return <>{children}</>;
}
