"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { api, apiBlob } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import type { Evaluation } from "@/lib/types";

export default function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pdf" | "retry" | "delete" | null>(null);

  useEffect(() => {
    api<{ evaluation: Evaluation }>(`/api/evaluations/${id}`)
      .then((r) => setEvaluation(r.evaluation))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function openPdf() {
    setBusy("pdf");
    // 팝업 차단을 피하려고 클릭 직후 창을 먼저 열고, 내려받은 뒤 주소를 지정합니다.
    const win = window.open("", "_blank");
    try {
      const blob = await apiBlob(`/api/evaluations/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      win?.close();
      setError(err instanceof Error ? err.message : "PDF를 열 수 없습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function retry() {
    setBusy("retry");
    setError(null);
    try {
      const r = await api<{ evaluation: Evaluation }>(`/api/evaluations/${id}`, { method: "POST" });
      setEvaluation(r.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "다시 평가하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("이 평가 결과와 업로드한 PDF를 삭제할까요?")) return;
    setBusy("delete");
    try {
      await api(`/api/evaluations/${id}`, { method: "DELETE" });
      router.replace("/evaluations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
      setBusy(null);
    }
  }

  if (!evaluation) {
    return error ? <div className="alert error">{error}</div> : <p className="muted">불러오는 중…</p>;
  }

  const r = evaluation.result;

  return (
    <div className="stack">
      <Link href="/evaluations" className="muted">
        ← 평가 결과 목록
      </Link>

      <div className="page-head">
        <div>
          <h1>{evaluation.studentName || "(이름 없음)"}</h1>
          <p className="muted">
            {evaluation.fileName} ({formatBytes(evaluation.fileSize)}) · {evaluation.rubricTitle} · {formatDate(evaluation.createdAt)}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={openPdf} disabled={busy !== null}>
            {busy === "pdf" ? "여는 중…" : "PDF 보기"}
          </button>
          <button className="btn" onClick={retry} disabled={busy !== null}>
            {busy === "retry" ? "다시 평가하는 중…" : "다시 평가"}
          </button>
          <button className="btn danger" onClick={remove} disabled={busy !== null}>
            삭제
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {evaluation.status === "error" && (
        <div className="alert error">AI 평가에 실패했습니다: {evaluation.error} — &ldquo;다시 평가&rdquo;를 눌러 재시도하세요.</div>
      )}
      {evaluation.status === "processing" && (
        <div className="alert">평가가 진행 중이거나 중단되었습니다. 잠시 후 새로고침하거나 &ldquo;다시 평가&rdquo;를 누르세요.</div>
      )}

      {r && (
        <>
          <div className="card total">
            <div className="total-score">
              <span className="big">{r.totalScore}</span>
              <span className="muted"> / {r.maxTotalScore}점</span>
            </div>
            <div className="bar">
              <div style={{ width: `${(r.totalScore / Math.max(r.maxTotalScore, 1)) * 100}%` }} />
            </div>
            <h3>총평</h3>
            <p className="pre">{r.overallSummary}</p>
          </div>

          {r.criteria.map((c) => (
            <section key={c.criterionId} className="card criterion-result">
              <div className="criterion-head">
                <h3>{c.name}</h3>
                <span className="score">
                  {c.score} <span className="muted">/ {c.maxScore}</span>
                </span>
              </div>
              <div className="bar small">
                <div style={{ width: `${(c.score / Math.max(c.maxScore, 1)) * 100}%` }} />
              </div>
              <h4>판단 근거</h4>
              <p className="pre">{c.rationale}</p>
              {c.suggestions.length > 0 && (
                <>
                  <h4>개선 제안</h4>
                  <ul>
                    {c.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          ))}

          <p className="muted small-print">
            AI({evaluation.model}) 평가 결과는 참고 자료입니다. 최종 판단은 교사가 직접 확인해 주세요.
          </p>
        </>
      )}
    </div>
  );
}
