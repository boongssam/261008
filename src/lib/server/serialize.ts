import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Evaluation, Rubric } from "@/lib/types";
import { toIso } from "./firebase-admin";

export function serializeRubric(snap: DocumentSnapshot): Rubric {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    title: d.title ?? "",
    description: d.description ?? "",
    criteria: d.criteria ?? [],
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

export function serializeEvaluation(snap: DocumentSnapshot): Evaluation {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    rubricId: d.rubricId ?? "",
    rubricTitle: d.rubricTitle ?? "",
    rubricSnapshot: d.rubricSnapshot ?? [],
    studentName: d.studentName ?? "",
    fileName: d.fileName ?? "",
    fileSize: d.fileSize ?? 0,
    status: d.status ?? "error",
    error: d.error ?? null,
    result: d.result ?? null,
    model: d.model ?? null,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}
