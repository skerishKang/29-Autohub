"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface MeData {
  id: string;
  email: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchMe() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "사용자 정보를 가져오지 못했습니다.");
        }

        const me = data.data as MeData;

        if (me.role !== "admin") {
          setError("관리자 권한이 필요한 페이지입니다.");
          setUser(me);
          return;
        }

        setUser(me);
      } catch (err: any) {
        setError(err?.message || "사용자 정보 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        관리자 페이지 로딩 중...
      </div>
    );
  }

  if (error || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100">
        <p className="mb-4 text-red-300">{error || "관리자 권한이 없습니다."}</p>
        <button
          type="button"
          className="rounded-md bg-sky-500 hover:bg-sky-600 px-4 py-2 text-sm font-medium"
          onClick={() => router.replace("/dashboard")}
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-slate-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <span className="text-sm text-slate-300">{user.email}</span>
        </div>
        <p className="text-sm text-slate-300">
          관리자 전용 페이지입니다. 실제 통계/설정 화면은 이후 단계에서 구현합니다.
        </p>
      </div>
    </div>
  );
}
