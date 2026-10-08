"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Rubric } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ rubrics: Rubric[] }>("/api/rubrics")
      .then((r) => setRubrics(r.rubrics))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>평가 기준</h1>
        <Link href="/rubrics/new" className="btn primary">
          + 새 평가 기준
        </Link>
      </div>

      {error && <div className="alert error">{error}</div>}
      {!rubrics && !error && <p className="muted">불러오는 중…</p>}
      {rubrics?.length === 0 && (
        <div className="card empty">
          아직 평가 기준이 없습니다. <Link href="/rubrics/new">첫 평가 기준 만들기</Link>
        </div>
      )}

      <div className="grid">
        {rubrics?.map((r) => (
          <Link key={r.id} href={`/rubrics/${r.id}`} className="card rubric-card">
            <h3>{r.title}</h3>
            {r.description && <p className="muted clamp">{r.description}</p>}
            <p className="meta">
              항목 {r.criteria.length}개 · 총 {r.criteria.reduce((s, c) => s + c.maxScore, 0)}점 · 수정 {formatDate(r.updatedAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
