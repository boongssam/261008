"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Evaluation } from "@/lib/types";

const STATUS_LABEL = { processing: "평가 중", done: "완료", error: "오류" } as const;

export default function EvaluationsPage() {
  const [items, setItems] = useState<Evaluation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api<{ evaluations: Evaluation[] }>("/api/evaluations")
      .then((r) => setItems(r.evaluations))
      .catch((e: Error) => setError(e.message));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = items?.filter(
    (e) => !q || [e.studentName, e.fileName, e.rubricTitle].some((s) => s.toLowerCase().includes(q)),
  );

  return (
    <div className="stack">
      <div className="page-head">
        <h1>평가 결과</h1>
        <input className="search" placeholder="학생·파일·기준 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {error && <div className="alert error">{error}</div>}
      {!items && !error && <p className="muted">불러오는 중…</p>}
      {items?.length === 0 && (
        <div className="card empty">
          아직 평가한 활동지가 없습니다. <Link href="/evaluate">활동지 평가하기</Link>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>학생</th>
                <th>파일</th>
                <th>평가 기준</th>
                <th>점수</th>
                <th>상태</th>
                <th>평가일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/evaluations/${e.id}`}>{e.studentName || "(이름 없음)"}</Link>
                  </td>
                  <td className="ellipsis">{e.fileName}</td>
                  <td className="ellipsis">{e.rubricTitle}</td>
                  <td>{e.result ? `${e.result.totalScore} / ${e.result.maxTotalScore}` : "-"}</td>
                  <td>
                    <span className={`badge ${e.status}`}>{STATUS_LABEL[e.status]}</span>
                  </td>
                  <td className="nowrap">{formatDate(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
