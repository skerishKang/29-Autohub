"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface MessageEvent {
  id: string;
  tenant_id: string;
  direction: "inbound" | "outbound" | string;
  channel: string;
  device_id: string | null;
  external_id: string | null;
  sender: string | null;
  recipient: string | null;
  body: string | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"all" | "inbound" | "outbound">("all");

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("autohub_token") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchMessages() {
      try {
        const params = new URLSearchParams();
        if (direction !== "all") {
          params.set("direction", direction);
        }
        const query = params.toString();

        const res = await fetch(
          `${API_BASE_URL}/api/messages${query ? `?${query}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.message || "메시지 로그를 가져오지 못했습니다.");
        }

        const list = (json.data?.messages || []) as MessageEvent[];
        setMessages(list);
      } catch (err: any) {
        setError(err?.message || "메시지 로그 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [router, direction]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold">메시지 로그</h1>
          <div className="flex gap-2 items-center">
            <select
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500"
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
            >
              <option value="all">전체</option>
              <option value="inbound">수신(Inbound)</option>
              <option value="outbound">발신(Outbound)</option>
            </select>
            <button
              type="button"
              className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1 text-xs"
              onClick={() => router.push("/dashboard")}
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-300">표시할 메시지가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-300">
                    <th className="py-2 pr-3">시간</th>
                    <th className="py-2 pr-3">방향</th>
                    <th className="py-2 pr-3">채널</th>
                    <th className="py-2 pr-3">deviceId</th>
                    <th className="py-2 pr-3">보낸이</th>
                    <th className="py-2 pr-3">받는이</th>
                    <th className="py-2 pr-3">상태</th>
                    <th className="py-2 pr-3">본문</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m.id} className="border-b border-slate-800 align-top">
                      <td className="py-2 pr-3 text-slate-400">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3">
                        {m.direction === "inbound" ? "수신" : m.direction === "outbound" ? "발신" : m.direction}
                      </td>
                      <td className="py-2 pr-3">{m.channel}</td>
                      <td className="py-2 pr-3 font-mono">{m.device_id || "-"}</td>
                      <td className="py-2 pr-3">{m.sender || "-"}</td>
                      <td className="py-2 pr-3">{m.recipient || "-"}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            m.status.startsWith("failed")
                              ? "text-red-300"
                              : m.status === "queued"
                              ? "text-amber-300"
                              : "text-emerald-300"
                          }
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 max-w-xs truncate" title={m.body || undefined}>
                        {m.body || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
