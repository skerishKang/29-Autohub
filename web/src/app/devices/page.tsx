"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface Device {
  id: string;
  tenantId: string;
  deviceId: string;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string | null;
  agentVersion?: string | null;
}

interface DeviceSummary {
  device: Device;
  messages: {
    inboundCount: number;
    outboundCount: number;
    outboundSentCount: number;
    outboundFailedCount: number;
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
  };
}

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<DeviceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchDevices() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/devices`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.message || "디바이스 목록을 가져오지 못했습니다.");
        }

        const list = (json.data?.devices || []) as Device[];
        setDevices(list);
      } catch (err: any) {
        setError(err?.message || "디바이스 목록 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!deviceId.trim()) {
      setError("deviceId는 필수입니다.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId: deviceId.trim(), name: name.trim() || undefined }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "디바이스 등록에 실패했습니다.");
      }

      // 성공 시 목록 다시 로드
      setDeviceId("");
      setName("");

      const listRes = await fetch(`${API_BASE_URL}/api/devices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const listJson = await listRes.json();
      if (listRes.ok && listJson?.data?.devices) {
        setDevices(listJson.data.devices as Device[]);
      }
    } catch (err: any) {
      setError(err?.message || "디바이스 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSummary = async (targetDeviceId: string) => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    setSelectedSummary(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/devices/${encodeURIComponent(targetDeviceId)}/summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "디바이스 요약 정보를 가져오지 못했습니다.");
      }

      if (json?.data) {
        setSelectedSummary(json.data as DeviceSummary);
      }
    } catch (err: any) {
      setSummaryError(err?.message || "디바이스 요약 정보 조회 중 오류가 발생했습니다.");
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6">
        {copiedId && (
          <p className="text-xs text-emerald-300">deviceId가 클립보드에 복사되었습니다: {copiedId}</p>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">디바이스 관리</h1>
          <button
            type="button"
            className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1 text-sm"
            onClick={() => router.push("/dashboard")}
          >
            대시보드로 돌아가기
          </button>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 border border-slate-700 rounded-lg p-4 bg-slate-900/40">
          <p className="font-semibold text-sm">새 디바이스 등록</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="deviceId (예: 폰/에이전트에서 사용하는 고유 ID)"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
            <input
              type="text"
              className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="디바이스 이름 (선택)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-4 py-2 text-sm font-medium"
            >
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>

        <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
          <p className="font-semibold text-sm mb-3">등록된 디바이스</p>
          {devices.length === 0 ? (
            <p className="text-sm text-slate-300">등록된 디바이스가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-300">
                    <th className="py-2 pr-4">deviceId</th>
                    <th className="py-2 pr-4">이름</th>
                    <th className="py-2 pr-4">에이전트 버전</th>
                    <th className="py-2 pr-4">상태</th>
                    <th className="py-2 pr-4">마지막 통신</th>
                    <th className="py-2 pr-4">생성일</th>
                    <th className="py-2 pr-4">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => {
                    const lastSeenDate = d.lastSeenAt ? new Date(d.lastSeenAt) : null;
                    const isOnline =
                      lastSeenDate && !Number.isNaN(lastSeenDate.getTime())
                        ? Date.now() - lastSeenDate.getTime() < 5 * 60 * 1000
                        : false;

                    return (
                      <tr key={d.id} className="border-b border-slate-800">
                        <td className="py-2 pr-4 font-mono text-xs">{d.deviceId}</td>
                        <td className="py-2 pr-4">{d.name || "-"}</td>
                        <td className="py-2 pr-4 text-xs text-slate-300">
                          {d.agentVersion || "-"}
                        </td>
                        <td className="py-2 pr-4">
                          <span>{d.status}</span>
                          {lastSeenDate && (
                            <span
                              className={
                                "ml-2 text-xs " +
                                (isOnline ? "text-emerald-300" : "text-slate-400")
                              }
                            >
                              {isOnline ? "온라인" : "오프라인"}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-400">
                          {lastSeenDate ? lastSeenDate.toLocaleString() : "-"}
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-400">
                          {new Date(d.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-md bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(d.deviceId);
                                  setCopiedId(d.deviceId);
                                } catch (e) {
                                  setCopiedId(d.deviceId);
                                }
                              }}
                            >
                              ID 복사
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-sky-500 hover:bg-sky-600 px-2 py-1 text-xs"
                              onClick={() =>
                                router.push(`/messages?deviceId=${encodeURIComponent(d.deviceId)}`)
                              }
                            >
                              메시지 보기
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs"
                              onClick={() => handleViewSummary(d.deviceId)}
                            >
                              요약 보기
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs"
                              onClick={() =>
                                router.push(`/devices/${encodeURIComponent(d.deviceId)}`)
                              }
                            >
                              상세 페이지
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedSummary && (
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
            <p className="font-semibold text-sm mb-2">선택된 디바이스 요약</p>
            {summaryLoading && (
              <p className="text-xs text-slate-300 mb-1">요약 정보를 불러오는 중...</p>
            )}
            <div className="text-xs space-y-1">
              <p>
                <span className="font-semibold">deviceId: </span>
                {selectedSummary.device.deviceId}
              </p>
              <p>
                <span className="font-semibold">이름: </span>
                {selectedSummary.device.name || "-"}
              </p>
              <p>
                <span className="font-semibold">에이전트 버전: </span>
                {selectedSummary.device.agentVersion || "-"}
              </p>
              <p>
                <span className="font-semibold">상태: </span>
                {selectedSummary.device.status}
              </p>
              <p>
                <span className="font-semibold">수신(Inbound): </span>
                {selectedSummary.messages.inboundCount.toLocaleString()} 건
              </p>
              <p>
                <span className="font-semibold">발신(Outbound): </span>
                {selectedSummary.messages.outboundCount.toLocaleString()} 건
              </p>
              <p>
                <span className="font-semibold">발신 성공/실패: </span>
                {selectedSummary.messages.outboundSentCount.toLocaleString()} / {" "}
                {selectedSummary.messages.outboundFailedCount.toLocaleString()} 건
              </p>
              <p>
                <span className="font-semibold">마지막 수신 시각: </span>
                {selectedSummary.messages.lastInboundAt
                  ? new Date(selectedSummary.messages.lastInboundAt).toLocaleString()
                  : "-"}
              </p>
              <p>
                <span className="font-semibold">마지막 발신 시각: </span>
                {selectedSummary.messages.lastOutboundAt
                  ? new Date(selectedSummary.messages.lastOutboundAt).toLocaleString()
                  : "-"}
              </p>
            </div>
            {summaryError && (
              <p className="text-xs text-red-300 mt-2">{summaryError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
