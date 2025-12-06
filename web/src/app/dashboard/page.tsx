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

interface PlanInfo {
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  includedCredits: number;
  deviceLimit: number;
  workflowLimit: number;
  memberLimit: number;
  isPublic: boolean;
}

interface BillingUsageSummary {
  plan: PlanInfo;
  periodStart: string;
  periodEnd: string;
  usedCredits: number;
  remainingCredits: number; // 마이너스일 수도 있음 (초과 사용)
}

interface AnalyticsSummary {
  periodStart: string;
  periodEnd: string;
  inboundCount: number;
  outboundCount: number;
  outboundSuccessCount: number;
  outboundFailedCount: number;
  outboundSuccessRate: number | null;
}

interface DeviceForDashboard {
  id: string;
  tenantId: string;
  deviceId: string;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingUsageSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [deviceStats, setDeviceStats] = useState<{
    total: number;
    online: number;
    offline: number;
  } | null>(null);

  // 마운트 시 /api/users/me 호출로 사용자 정보 조회
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchMeAndBilling() {
      try {
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
        };

        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: {
            ...headers,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "사용자 정보를 가져오지 못했습니다.");
        }

        setUser(data.data as MeData);

        // 요금제/크레딧 사용량 조회 (실패해도 전체 페이지는 계속 동작)
        try {
          const billingRes = await fetch(`${API_BASE_URL}/api/billing/usage`, {
            headers,
          });
          const billingJson = await billingRes.json();
          if (billingRes.ok && billingJson?.data) {
            setBilling(billingJson.data as BillingUsageSummary);
          }
        } catch {
          // 대시보드 사용량 섹션만 비워두고 무시
        }

        // 수신/발신 메트릭 조회 (실패해도 무시)
        try {
          const analyticsRes = await fetch(`${API_BASE_URL}/api/analytics/summary`, {
            headers,
          });
          const analyticsJson = await analyticsRes.json();
          if (analyticsRes.ok && analyticsJson?.data) {
            setAnalytics(analyticsJson.data as AnalyticsSummary);
          }
        } catch {
          // 통계 섹션만 비워두고 무시
        }

        // 디바이스 상태 요약 조회 (실패해도 무시)
        try {
          const devicesRes = await fetch(`${API_BASE_URL}/api/devices`, {
            headers,
          });
          const devicesJson = await devicesRes.json();

          if (devicesRes.ok && devicesJson?.data?.devices) {
            const devices = devicesJson.data.devices as DeviceForDashboard[];
            const now = Date.now();
            const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

            const total = devices.length;
            let online = 0;

            for (const d of devices) {
              if (!d.lastSeenAt) continue;
              const lastSeenTime = new Date(d.lastSeenAt).getTime();
              if (!Number.isNaN(lastSeenTime) && now - lastSeenTime < ONLINE_THRESHOLD_MS) {
                online += 1;
              }
            }

            const offline = total > online ? total - online : 0;

            setDeviceStats({ total, online, offline });
          }
        } catch {
          // 디바이스 상태 요약 조회 실패는 무시
        }
      } catch (err: any) {
        setError(err?.message || "사용자 정보 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMeAndBilling();
  }, [router]);

  // 공개 플랜 목록 조회
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/billing/plans`);
        const json = await res.json();
        if (res.ok && json?.data?.plans) {
          setPlans(json.data.plans as PlanInfo[]);
        }
      } catch {
        // 플랜 목록 조회 실패는 무시 (플랜 변경 UI만 비활성)
      }
    }

    fetchPlans();
  }, []);

  // 현재 플랜과 선택된 플랜 동기화
  useEffect(() => {
    if (billing && !selectedPlanCode) {
      setSelectedPlanCode(billing.plan.code);
    }
  }, [billing, selectedPlanCode]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("autohub_token");
    }
    router.replace("/login");
  };

  const handleChangePlan = async () => {
    if (!billing || !selectedPlanCode || selectedPlanCode === billing.plan.code) {
      return;
    }

    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    setChangingPlan(true);
    setPlanError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/change-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planCode: selectedPlanCode }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "플랜 변경에 실패했습니다.");
      }

      if (json?.data) {
        setBilling(json.data as BillingUsageSummary);
      }
    } catch (err: any) {
      setPlanError(err?.message || "플랜 변경 중 오류가 발생했습니다.");
    } finally {
      setChangingPlan(false);
    }
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
          <div className="space-y-4">
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

            {billing && (
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm space-y-2">
                <p className="font-semibold">요금제 / 크레딧 사용량</p>
                <p>
                  <span className="font-semibold">플랜: </span>
                  {billing.plan.name} ({billing.plan.code})
                </p>
                <p>
                  <span className="font-semibold">청구 기간: </span>
                  {billing.periodStart} ~ {billing.periodEnd}
                </p>
                <p>
                  <span className="font-semibold">이번 기간 사용량: </span>
                  {billing.usedCredits.toLocaleString()} / {billing.plan.includedCredits.toLocaleString()} 크레딧
                </p>
                <p>
                  <span className="font-semibold">남은 크레딧: </span>
                  {billing.remainingCredits.toLocaleString()} 크레딧
                  {billing.remainingCredits < 0 && (
                    <span className="ml-2 text-amber-300">
                      (초과 사용 중 - 개발/테스트 단계에서는 발송이 계속 허용됩니다)
                    </span>
                  )}
                </p>

                {plans.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-slate-700 space-y-2">
                    <p className="font-semibold">플랜 변경</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <select
                        className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-sky-500"
                        value={selectedPlanCode ?? billing.plan.code}
                        onChange={(e) => setSelectedPlanCode(e.target.value)}
                      >
                        {plans.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name} ({p.code}) - {p.priceMonthly.toLocaleString()}원/월
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleChangePlan}
                        disabled={
                          changingPlan ||
                          !selectedPlanCode ||
                          selectedPlanCode === billing.plan.code
                        }
                        className="rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-4 py-2 text-xs font-medium"
                      >
                        {changingPlan ? "변경 중..." : "플랜 변경"}
                      </button>
                    </div>
                    {planError && <p className="text-xs text-red-300">{planError}</p>}
                  </div>
                )}
              </div>
            )}

            {analytics && (
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm space-y-2">
                <p className="font-semibold">메시지 통계 (현재 청구 기간)</p>
                <p>
                  <span className="font-semibold">기간: </span>
                  {analytics.periodStart} ~ {analytics.periodEnd}
                </p>
                <p>
                  <span className="font-semibold">수신(Inbound): </span>
                  {analytics.inboundCount.toLocaleString()} 건
                </p>
                <p>
                  <span className="font-semibold">발신(Outbound): </span>
                  {analytics.outboundCount.toLocaleString()} 건
                </p>
                <p>
                  <span className="font-semibold">발신 성공/실패: </span>
                  {analytics.outboundSuccessCount.toLocaleString()} / {analytics.outboundFailedCount.toLocaleString()} 건
                  {analytics.outboundSuccessRate !== null && (
                    <span className="ml-2 text-sky-300">
                      (성공률 {(analytics.outboundSuccessRate * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
              </div>
            )}

            {deviceStats && (
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm space-y-2">
                <p className="font-semibold">디바이스 상태 요약</p>
                <p>
                  <span className="font-semibold">전체 디바이스: </span>
                  {deviceStats.total.toLocaleString()}대
                </p>
                <p>
                  <span className="font-semibold">온라인: </span>
                  <span className="text-emerald-300">
                    {deviceStats.online.toLocaleString()}대
                  </span>
                  <span className="ml-3 font-semibold">오프라인: </span>
                  <span className="text-slate-300">
                    {deviceStats.offline.toLocaleString()}대
                  </span>
                </p>
              </div>
            )}

            {user.role === "admin" && (
              <div className="pt-2">
                <button
                  type="button"
                  className="rounded-md bg-sky-500 hover:bg-sky-600 px-4 py-2 text-sm font-medium"
                  onClick={() => router.push("/admin")}
                >
                  관리자 대시보드로 이동
                </button>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                className="rounded-md bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm mr-2"
                onClick={() => router.push("/devices")}
              >
                디바이스 관리로 이동
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm"
                onClick={() => router.push("/messages")}
              >
                메시지 로그 보기
              </button>
            </div>
          </div>
        )}
        {!user && <p>사용자 정보를 불러올 수 없습니다.</p>}
      </div>
    </div>
  );
}
