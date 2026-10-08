import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, HttpError, requireTeacher } from "@/lib/server/auth";
import { bucket, evaluationsCol } from "@/lib/server/firebase-admin";
import { evaluateWorksheetPdf, geminiModel } from "@/lib/server/gemini";
import { serializeEvaluation } from "@/lib/server/serialize";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const snap = await evaluationsCol(uid).doc((await params).id).get();
    if (!snap.exists) throw new HttpError(404, "평가 결과를 찾을 수 없습니다.");
    return NextResponse.json({ evaluation: serializeEvaluation(snap) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** 저장된 PDF와 당시의 평가 기준 스냅샷으로 다시 평가합니다. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const ref = evaluationsCol(uid).doc((await params).id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "평가 결과를 찾을 수 없습니다.");
    const data = snap.data()!;

    const [pdf] = await bucket().file(data.storagePath).download();
    await ref.update({ status: "processing", error: null, model: geminiModel(), updatedAt: FieldValue.serverTimestamp() });

    try {
      const result = await evaluateWorksheetPdf({
        pdf,
        rubricTitle: data.rubricTitle,
        rubricDescription: data.rubricDescription ?? "",
        criteria: data.rubricSnapshot,
      });
      await ref.update({ status: "done", result, updatedAt: FieldValue.serverTimestamp() });
    } catch (err) {
      console.error("Gemini re-evaluation failed", err);
      const message = err instanceof Error ? err.message : "AI 평가 중 오류가 발생했습니다.";
      await ref.update({ status: "error", error: message.slice(0, 500), updatedAt: FieldValue.serverTimestamp() });
    }

    return NextResponse.json({ evaluation: serializeEvaluation(await ref.get()) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const ref = evaluationsCol(uid).doc((await params).id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "평가 결과를 찾을 수 없습니다.");
    const storagePath = snap.get("storagePath") as string | undefined;
    if (storagePath) await bucket().file(storagePath).delete({ ignoreNotFound: true });
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
