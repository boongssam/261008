"use client";

import { auth } from "./firebase-client";

async function authHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = { ...(init.headers as Record<string, string> | undefined), ...(await authHeader()) };
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `요청에 실패했습니다. (${res.status})`);
  }
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await request(path, init)).json();
}

export async function apiJson<T>(path: string, method: string, body: unknown): Promise<T> {
  return api<T>(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function apiBlob(path: string): Promise<Blob> {
  return (await request(path)).blob();
}
