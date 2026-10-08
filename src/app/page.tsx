"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase-client";

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
    "auth/email-already-in-use": "이미 가입된 이메일입니다.",
    "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
    "auth/popup-closed-by-user": "로그인 창이 닫혔습니다.",
    "auth/too-many-requests": "시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
  };
  return map[code] ?? "로그인에 실패했습니다.";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, access, accessError, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && access === "allowed") router.replace("/evaluate");
  }, [user, access, router]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    run(() =>
      mode === "login"
        ? signInWithEmailAndPassword(auth, email, password)
        : createUserWithEmailAndPassword(auth, email, password),
    );
  }

  return (
    <main className="login-wrap">
      <div className="card login-card">
        <h1>활동지 AI 평가</h1>
        <p className="muted">교사 계정으로 로그인하세요.</p>

        {user && access === "denied" ? (
          <div className="stack">
            <div className="alert error">{accessError}</div>
            <button className="btn" onClick={logout}>
              다른 계정으로 로그인
            </button>
          </div>
        ) : user ? (
          <p className="muted">권한 확인 중…</p>
        ) : (
          <div className="stack">
            <button className="btn primary" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>
              Google 계정으로 로그인
            </button>
            <div className="divider">또는</div>
            <form className="stack" onSubmit={onSubmit}>
              <label className="field">
                <span>이메일</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label className="field">
                <span>비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </label>
              <button className="btn" type="submit" disabled={busy}>
                {mode === "login" ? "이메일로 로그인" : "계정 만들기"}
              </button>
            </form>
            <button className="link" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "계정이 없나요? 가입하기" : "이미 계정이 있나요? 로그인"}
            </button>
            {error && <div className="alert error">{error}</div>}
          </div>
        )}
      </div>
    </main>
  );
}
