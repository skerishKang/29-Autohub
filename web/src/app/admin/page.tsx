"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface MeData {
  id: string;
  email: string;
  role: string;
}

interface TenantSummary {
  id: string;
  name: string;
  plan_code: string;
  plan_name: string;
  price_monthly: number;
  included_credits: number;
  credits_used: number;
  inbound_count: number;
  outbound_count: number;
  device_count: number;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [topupAmounts, setTopupAmounts] = useState<Record<string, string>>({});
  const [topupLoadingId, setTopupLoadingId] = useState<string | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);

  const reloadTenants = async (token: string) => {
    try {
      const adminRes = await fetch(`${API_BASE_URL}/api/admin/tenants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const adminJson = await adminRes.json();
      if (adminRes.ok && adminJson?.data) {
        setTenants((adminJson.data.tenants || []) as TenantSummary[]);
        setPeriod({
          start: adminJson.data.periodStart,
          end: adminJson.data.periodEnd,
        });
      }
    } catch {
      // 무시: 테넌트 요약 로드 실패 시 기존 상태 유지
    }
  };

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchAdminData() {
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

        await reloadTenants(token);
      } catch (err: any) {
        setError(err?.message || "사용자 정보 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, [router]);

  const handleTopup = async (tenantId: string) => {
    const amountStr = topupAmounts[tenantId];
    const parsedAmount = Number(amountStr);

    if (!amountStr || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setTopupError("추가 크레딧(amount)은 0보다 큰 숫자여야 합니다.");
      return;
    }

    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    setTopupLoadingId(tenantId);
    setTopupError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId, amount: parsedAmount, reason: "topup:admin" }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "크레딧 Top-up에 실패했습니다.");
      }

      await reloadTenants(token);
    } catch (err: any) {
      setTopupError(err?.message || "크레딧 Top-up 처리 중 오류가 발생했습니다.");
    } finally {
      setTopupLoadingId(null);
    }
  };

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
      <div className="w-full max-w-5xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">관리자 대시보드</h1>
            <p className="text-xs text-slate-300 mt-1">
              전체 테넌트의 플랜/사용량/메시지 현황을 한눈에 보는 운영자용 화면입니다.
            </p>
          </div>
          <span className="text-sm text-slate-300">{user.email}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300">
          <button
            type="button"
            className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1 text-xs"
            onClick={() => router.push("/dashboard")}
          >
            내 대시보드로 돌아가기
          </button>
          {period && (
            <span>
              청구 기간: {period.start} ~ {period.end}
            </span>
          )}
        </div>

        <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
          {topupError && <p className="mb-2 text-xs text-red-300">{topupError}</p>}
          {tenants.length === 0 ? (
            <p className="text-sm text-slate-300">등록된 테넌트가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-300">
                    <th className="py-2 pr-3">테넌트 이름</th>
                    <th className="py-2 pr-3">플랜</th>
                    <th className="py-2 pr-3">월 요금</th>
                    <th className="py-2 pr-3">포함 크레딧</th>
                    <th className="py-2 pr-3">사용 크레딧</th>
                    <th className="py-2 pr-3">크레딧 조정(Top-up)</th>
                    <th className="py-2 pr-3">수신/발신</th>
                    <th className="py-2 pr-3">디바이스 수</th>
                    <th className="py-2 pr-3">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => {
                    const remaining = t.included_credits - t.credits_used;
                    return (
                      <tr key={t.id} className="border-b border-slate-800 align-top">
                        <td className="py-2 pr-3">{t.name}</td>
                        <td className="py-2 pr-3">
                          {t.plan_name} ({t.plan_code})
                        </td>
                        <td className="py-2 pr-3">{t.price_monthly.toLocaleString()}원</td>
                        <td className="py-2 pr-3">{t.included_credits.toLocaleString()}</td>
                        <td className="py-2 pr-3">
                          {t.credits_used.toLocaleString()}
                          {remaining < 0 && (
                            <span className="ml-1 text-amber-300">(초과 {Math.abs(remaining).toLocaleString()})</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              className="w-20 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500"
                              placeholder="예: 1000"
                              value={topupAmounts[t.id] || ""}
                              onChange={(e) =>
                                setTopupAmounts((prev) => ({ ...prev, [t.id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-2 py-1 text-xs"
                              disabled={topupLoadingId === t.id}
                              onClick={() => handleTopup(t.id)}
                            >
                              {topupLoadingId === t.id ? "적용 중..." : "적용"}
                            </button>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          {t.inbound_count.toLocaleString()} / {t.outbound_count.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3">{t.device_count.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-slate-400">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
