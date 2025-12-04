"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 백엔드 API 기본 URL (환경변수에서 가져오고 없으면 로컬 기본값 사용)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface MeData {
  id: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 /api/users/me 호출로 사용자 정보 조회
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

        setUser(data.data as MeData);
      } catch (err: any) {
        setError(err?.message || "사용자 정보 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMe();
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("autohub_token");
    }
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100">
        <p className="mb-4 text-red-300">{error}</p>
        <button
          type="button"
          className="rounded-md bg-sky-500 hover:bg-sky-600 px-4 py-2 text-sm font-medium"
          onClick={() => router.replace("/login")}
        >
          로그인 화면으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">AutoHub 대시보드</h1>
          <button
            type="button"
            className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1 text-sm"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
        {user && (
          <div className="space-y-2">
            <p>
              <span className="font-semibold">이메일: </span>
              {user.email}
            </p>
            <p>
              <span className="font-semibold">역할: </span>
              {user.role}
            </p>
          </div>
        )}
        {!user && <p>사용자 정보를 불러올 수 없습니다.</p>}
      </div>
    </div>
  );
}
