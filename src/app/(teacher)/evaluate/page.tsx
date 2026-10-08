"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { MAX_PDF_BYTES, type Evaluation, type Rubric } from "@/lib/types";

export default function EvaluatePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null);
  const [rubricId, setRubricId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ rubrics: Rubric[] }>("/api/rubrics")
      .then(({ rubrics }) => {
        setRubrics(rubrics);
        if (rubrics[0]) setRubricId(rubrics[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  function pickFile(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF 파일만 업로드할 수 있습니다.");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setError("PDF는 10MB 이하만 업로드할 수 있습니다.");
      return;
    }
    setFile(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !rubricId) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("rubricId", rubricId);
      form.append("studentName", studentName);
      const { evaluation } = await api<{ evaluation: Evaluation }>("/api/evaluations", { method: "POST", body: form });
      router.push(`/evaluations/${evaluation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "평가 요청에 실패했습니다.");
      setBusy(false);
    }
  }

  const selected = rubrics?.find((r) => r.id === rubricId);

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="page-head">
        <h1>활동지 평가하기</h1>
      </div>

      {rubrics?.length === 0 ? (
        <div className="card empty">
          먼저 평가 기준을 만들어 주세요. <Link href="/rubrics/new">평가 기준 만들기</Link>
        </div>
      ) : (
        <>
          <div className="card stack">
            <label className="field">
              <span>평가 기준</span>
              <select value={rubricId} onChange={(e) => setRubricId(e.target.value)} disabled={!rubrics || busy}>
                {!rubrics && <option>불러오는 중…</option>}
                {rubrics?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <ul className="criteria-preview">
                {selected.criteria.map((c) => (
                  <li key={c.id}>
                    {c.name} <span className="muted">({c.maxScore}점)</span>
                  </li>
                ))}
              </ul>
            )}
            <label className="field">
              <span>학생 이름 / 번호 (선택)</span>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} maxLength={100} disabled={busy} placeholder="예: 3번 김하늘" />
            </label>
          </div>

          <div
            className={`dropzone card ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !busy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {file ? (
              <p>
                📄 <strong>{file.name}</strong> <span className="muted">({formatBytes(file.size)})</span>
                <br />
                <span className="muted">다른 파일을 고르려면 클릭하세요.</span>
              </p>
            ) : (
              <p>
                학생 활동지 PDF를 여기로 끌어오거나 클릭해서 선택하세요.
                <br />
                <span className="muted">최대 10MB</span>
              </p>
            )}
          </div>

          {error && <div className="alert error">{error}</div>}

          <button className="btn primary large" type="submit" disabled={!file || !rubricId || busy}>
            {busy ? "Gemini가 활동지를 읽고 평가하는 중… (30초~1분)" : "AI 평가 시작"}
          </button>
        </>
      )}
    </form>
  );
}
