"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, apiJson } from "@/lib/api-client";
import type { Criterion, Rubric } from "@/lib/types";
import { rubricInputSchema } from "@/lib/validation";

const newId = () => crypto.randomUUID().slice(0, 8);

const TEMPLATE: Criterion[] = [
  { id: newId(), name: "내용 이해", description: "활동의 핵심 개념을 정확히 이해하고 설명했는가", maxScore: 10 },
  { id: newId(), name: "근거 제시", description: "자신의 생각을 뒷받침하는 근거나 예시를 들었는가", maxScore: 10 },
  { id: newId(), name: "표현과 완성도", description: "빈칸 없이 성실하게 작성하고 알아보기 쉽게 표현했는가", maxScore: 5 },
];

export function RubricEditor({ rubricId }: { rubricId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>(rubricId ? [] : TEMPLATE);
  const [loading, setLoading] = useState(Boolean(rubricId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!rubricId) return;
    api<{ rubric: Rubric }>(`/api/rubrics/${rubricId}`)
      .then(({ rubric }) => {
        setTitle(rubric.title);
        setDescription(rubric.description);
        setCriteria(rubric.criteria);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [rubricId]);

  function updateCriterion(index: number, patch: Partial<Criterion>) {
    setSaved(false);
    setCriteria((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function move(index: number, delta: number) {
    setCriteria((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsed = rubricInputSchema.safeParse({ title, description, criteria });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요.");
      return;
    }
    setSaving(true);
    try {
      if (rubricId) {
        await apiJson(`/api/rubrics/${rubricId}`, "PUT", parsed.data);
        setSaved(true);
      } else {
        const { rubric } = await apiJson<{ rubric: Rubric }>("/api/rubrics", "POST", parsed.data);
        router.replace(`/rubrics/${rubric.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!rubricId || !window.confirm("이 평가 기준을 삭제할까요? (이미 저장된 평가 결과는 유지됩니다)")) return;
    try {
      await api(`/api/rubrics/${rubricId}`, { method: "DELETE" });
      router.replace("/rubrics");
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  const total = criteria.reduce((s, c) => s + (Number.isFinite(c.maxScore) ? c.maxScore : 0), 0);

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="page-head">
        <h1>{rubricId ? "평가 기준 수정" : "새 평가 기준"}</h1>
        <div className="row">
          {rubricId && (
            <button type="button" className="btn danger" onClick={onDelete}>
              삭제
            </button>
          )}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert success">저장했습니다.</div>}

      <div className="card stack">
        <label className="field">
          <span>제목</span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            placeholder="예: 4학년 과학 – 식물의 한살이 관찰 활동지"
            maxLength={200}
          />
        </label>
        <label className="field">
          <span>활동 설명 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSaved(false);
            }}
            rows={3}
            placeholder="활동 목표, 학년, 학생에게 준 과제 안내 등 AI가 참고할 맥락을 적어 주세요."
            maxLength={4000}
          />
        </label>
      </div>

      <div className="page-head">
        <h2>평가 항목</h2>
        <span className="muted">총 {total}점</span>
      </div>

      {criteria.map((c, i) => (
        <div key={c.id} className="card criterion-edit">
          <div className="criterion-edit-head">
            <strong>항목 {i + 1}</strong>
            <div className="row">
              <button type="button" className="btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">
                ↑
              </button>
              <button type="button" className="btn small" onClick={() => move(i, 1)} disabled={i === criteria.length - 1} aria-label="아래로">
                ↓
              </button>
              <button
                type="button"
                className="btn small danger"
                onClick={() => setCriteria((list) => list.filter((_, j) => j !== i))}
                disabled={criteria.length === 1}
              >
                삭제
              </button>
            </div>
          </div>
          <div className="criterion-fields">
            <label className="field">
              <span>항목 이름</span>
              <input value={c.name} onChange={(e) => updateCriterion(i, { name: e.target.value })} maxLength={100} />
            </label>
            <label className="field score-field">
              <span>배점</span>
              <input
                type="number"
                min={1}
                max={100}
                value={Number.isFinite(c.maxScore) ? c.maxScore : ""}
                onChange={(e) => updateCriterion(i, { maxScore: e.target.valueAsNumber })}
              />
            </label>
          </div>
          <label className="field">
            <span>채점 기준 설명</span>
            <textarea
              value={c.description}
              onChange={(e) => updateCriterion(i, { description: e.target.value })}
              rows={2}
              placeholder="예: 상(9~10점) 관찰 결과를 3가지 이상 정확히 기록 / 중(5~8점) … / 하(0~4점) …"
              maxLength={2000}
            />
          </label>
        </div>
      ))}

      <button
        type="button"
        className="btn"
        disabled={criteria.length >= 20}
        onClick={() => setCriteria((list) => [...list, { id: newId(), name: "", description: "", maxScore: 10 }])}
      >
        + 평가 항목 추가
      </button>
    </form>
  );
}
