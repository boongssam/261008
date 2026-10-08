import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, HttpError, requireTeacher } from "@/lib/server/auth";
import { bucket, evaluationsCol, rubricsCol } from "@/lib/server/firebase-admin";
import { evaluateWorksheetPdf, geminiModel } from "@/lib/server/gemini";
import { serializeEvaluation, serializeRubric } from "@/lib/server/serialize";
import { MAX_PDF_BYTES } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { uid } = await requireTeacher(req);
    const snap = await evaluationsCol(uid).orderBy("createdAt", "desc").limit(200).get();
    return NextResponse.json({ evaluations: snap.docs.map(serializeEvaluation) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** PDF 업로드 → Cloud Storage 저장 → Gemini 평가 → Firestore 저장 */
export async function POST(req: Request) {
  try {
    const { uid } = await requireTeacher(req);

    const form = await req.formData();
    const file = form.get("file");
    const rubricId = String(form.get("rubricId") ?? "");
    const studentName = String(form.get("studentName") ?? "").trim().slice(0, 100);

    if (!(file instanceof File)) throw new HttpError(400, "PDF 파일을 선택하세요.");
    if (!rubricId) throw new HttpError(400, "평가 기준을 선택하세요.");
    if (file.size === 0) throw new HttpError(400, "빈 파일입니다.");
    if (file.size > MAX_PDF_BYTES) throw new HttpError(413, "PDF는 10MB 이하만 업로드할 수 있습니다.");

    const pdf = Buffer.from(await file.arrayBuffer());
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new HttpError(400, "PDF 파일만 업로드할 수 있습니다.");

    const rubricSnap = await rubricsCol(uid).doc(rubricId).get();
    if (!rubricSnap.exists) throw new HttpError(404, "평가 기준을 찾을 수 없습니다.");
    const rubric = serializeRubric(rubricSnap);

    const ref = evaluationsCol(uid).doc();
    const storagePath = `teachers/${uid}/evaluations/${ref.id}.pdf`;
    const fileName = file.name.slice(0, 200) || "worksheet.pdf";

    await bucket()
      .file(storagePath)
      .save(pdf, { contentType: "application/pdf", resumable: false, metadata: { metadata: { originalName: fileName } } });

    await ref.set({
      rubricId,
      rubricTitle: rubric.title,
      rubricDescription: rubric.description,
      rubricSnapshot: rubric.criteria,
      studentName,
      fileName,
      fileSize: file.size,
      storagePath,
      status: "processing",
      error: null,
      result: null,
      model: geminiModel(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    try {
      const result = await evaluateWorksheetPdf({
        pdf,
        rubricTitle: rubric.title,
        rubricDescription: rubric.description,
        criteria: rubric.criteria,
      });
      await ref.update({ status: "done", result, updatedAt: FieldValue.serverTimestamp() });
    } catch (err) {
      console.error("Gemini evaluation failed", err);
      const message = err instanceof Error ? err.message : "AI 평가 중 오류가 발생했습니다.";
      await ref.update({ status: "error", error: message.slice(0, 500), updatedAt: FieldValue.serverTimestamp() });
    }

    return NextResponse.json({ evaluation: serializeEvaluation(await ref.get()) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
