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
            지도를 불러오지 못했습니다
          </h2>
          <p className="text-sm text-slate-600">
            카카오맵 키 또는 도메인 설정을 확인해 주세요.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            <code className="rounded bg-slate-200 px-1.5 py-0.5">NEXT_PUBLIC_KAKAO_APP_KEY</code>
            가 빌드 환경에 설정되어 있는지, Kakao Developers의 사이트 도메인에
            현재 도메인이 등록되어 있는지 확인하세요.
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
            지도를 불러오지 못했습니다
          </h2>
          <p className="text-sm text-red-700">
            카카오맵 키 또는 도메인 설정을 확인해 주세요.
          </p>
          <p className="mt-2 text-xs text-red-500">
            카카오 Developers 콘솔의 JavaScript SDK 도메인 목록에 현재 사이트 도메인이
            등록되어 있어야 합니다.
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

  if (typeof window === "undefined" || !window.kakao || !window.kakao.maps) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 p-6 text-center text-sm text-slate-500">
        지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  return <>{children}</>;
}
