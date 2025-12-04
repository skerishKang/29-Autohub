"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 루트 경로 진입 시 로그인 여부에 따라 /dashboard 또는 /login으로 리다이렉트
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <p>페이지로 이동 중입니다...</p>
    </div>
  );
}
