"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";

// 백엔드 API 기본 URL (환경변수에서 가져오고 없으면 로컬 기본값 사용)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인 폼 제출 핸들러 (기존 이메일/비밀번호 백엔드 로그인)
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "로그인에 실패했습니다.");
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("autohub_token", data.data?.token);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Firebase 기반 구글 로그인 핸들러
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      // Firebase 팝업으로 구글 로그인 수행
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user) {
        throw new Error("Firebase 사용자 정보를 가져오지 못했습니다.");
      }

      const idToken = await user.getIdToken();

      // 우리 백엔드 브릿지 엔드포인트에 Firebase ID 토큰 전송
      const response = await fetch(`${API_BASE_URL}/api/auth/firebase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "구글 로그인 처리에 실패했습니다.");
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("autohub_token", data.data?.token);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "구글 로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">AutoHub 로그인</h1>
        {error && (
          <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/60 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-500 hover:bg-sky-600 disabled:bg-slate-500 text-white font-medium py-2 text-sm transition-colors"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <div className="mt-4">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full rounded-md border border-slate-600 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-medium py-2 text-sm transition-colors flex items-center justify-center gap-2"
          >
            <img
              src="/google.svg"
              alt="Google"
              className="h-4 w-4"
            />
            <span>Google 계정으로 로그인</span>
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-slate-300">
          계정이 없으신가요?{" "}
          <button
            type="button"
            className="text-sky-400 hover:underline"
            onClick={() => router.push("/signup")}
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  );
}
