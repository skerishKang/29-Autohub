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

interface PageProps {
  params: {
    deviceId: string;
  };
}

export default function DeviceDetailPage({ params }: PageProps) {
  const router = useRouter();
  const decodedDeviceId = decodeURIComponent(params.deviceId);

  const [summary, setSummary] = useState<DeviceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchSummary() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE_URL}/api/devices/${encodeURIComponent(decodedDeviceId)}/summary`,
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
          setSummary(json.data as DeviceSummary);
        }
      } catch (err: any) {
        setError(err?.message || "디바이스 요약 정보 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [router, decodedDeviceId]);

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
          className="rounded-md bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm"
          onClick={() => router.push("/devices")}
        >
          디바이스 목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100">
        <p className="mb-4 text-slate-300">디바이스 요약 정보를 찾을 수 없습니다.</p>
        <button
          type="button"
          className="rounded-md bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm"
          onClick={() => router.push("/devices")}
        >
          디바이스 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const { device, messages } = summary;
  const lastSeenDate = device.lastSeenAt ? new Date(device.lastSeenAt) : null;
  const isOnline =
    lastSeenDate && !Number.isNaN(lastSeenDate.getTime())
      ? Date.now() - lastSeenDate.getTime() < 5 * 60 * 1000
      : false;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">디바이스 상세</h1>
          <button
            type="button"
            className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1 text-sm"
            onClick={() => router.push("/devices")}
          >
            디바이스 목록으로 돌아가기
          </button>
        </div>

        <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40 text-sm space-y-2">
          <p>
            <span className="font-semibold">deviceId: </span>
            <span className="font-mono text-xs">{device.deviceId}</span>
          </p>
          <p>
            <span className="font-semibold">이름: </span>
            {device.name || "-"}
          </p>
          <p>
            <span className="font-semibold">에이전트 버전: </span>
            {device.agentVersion || "-"}
          </p>
          <p>
            <span className="font-semibold">상태: </span>
            {device.status}
            {lastSeenDate && (
              <span
                className={
                  "ml-2 text-xs " + (isOnline ? "text-emerald-300" : "text-slate-400")
                }
              >
                {isOnline ? "온라인" : "오프라인"}
              </span>
            )}
          </p>
          <p>
            <span className="font-semibold">마지막 통신: </span>
            {lastSeenDate ? lastSeenDate.toLocaleString() : "-"}
          </p>
          <p>
            <span className="font-semibold">생성일: </span>
            {new Date(device.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40 text-sm space-y-2">
          <p className="font-semibold">메시지 요약</p>
          <p>
            <span className="font-semibold">수신(Inbound): </span>
            {messages.inboundCount.toLocaleString()} 건
          </p>
          <p>
            <span className="font-semibold">발신(Outbound): </span>
            {messages.outboundCount.toLocaleString()} 건
          </p>
          <p>
            <span className="font-semibold">발신 성공/실패: </span>
            {messages.outboundSentCount.toLocaleString()} /{" "}
            {messages.outboundFailedCount.toLocaleString()} 건
          </p>
          <p>
            <span className="font-semibold">마지막 수신 시각: </span>
            {messages.lastInboundAt ? new Date(messages.lastInboundAt).toLocaleString() : "-"}
          </p>
          <p>
            <span className="font-semibold">마지막 발신 시각: </span>
            {messages.lastOutboundAt ? new Date(messages.lastOutboundAt).toLocaleString() : "-"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1 text-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(device.deviceId);
              } catch (e) {
                // ignore
              }
            }}
          >
            deviceId 복사
          </button>
          <button
            type="button"
            className="rounded-md bg-sky-500 hover:bg-sky-600 px-3 py-1 text-sm"
            onClick={() =>
              router.push(`/messages?deviceId=${encodeURIComponent(device.deviceId)}`)
            }
          >
            메시지 로그 보기
          </button>
        </div>
      </div>
    </div>
  );
}
