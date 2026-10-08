"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { auth } from "@/lib/firebase-client";

type Access = "unknown" | "allowed" | "denied";

type AuthState = {
  user: User | null;
  loading: boolean;
  access: Access;
  accessError: string | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Access>("unknown");
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAccess("unknown");
      setAccessError(null);
      if (u) {
        try {
          await api("/api/me"); // 서버에서 토큰 검증 + 교사 허용 목록 확인
          setAccess("allowed");
        } catch (err) {
          setAccess("denied");
          setAccessError(err instanceof Error ? err.message : "권한을 확인할 수 없습니다.");
        }
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, access, accessError, logout: () => signOut(auth) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
