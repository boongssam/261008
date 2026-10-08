"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";

const NAV = [
  { href: "/evaluate", label: "평가하기" },
  { href: "/evaluations", label: "평가 결과" },
  { href: "/rubrics", label: "평가 기준" },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, loading, access, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || access === "denied")) router.replace("/");
  }, [loading, user, access, router]);

  if (loading || !user || access !== "allowed") {
    return <div className="center muted">불러오는 중…</div>;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/evaluate" className="brand">
            활동지 AI 평가
          </Link>
          <nav>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={pathname.startsWith(n.href) ? "active" : ""}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="user">
            <span className="muted">{user.email}</span>
            <button className="btn small" onClick={logout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
