import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, HttpError, requireTeacher } from "@/lib/server/auth";
import { rubricsCol } from "@/lib/server/firebase-admin";
import { serializeRubric } from "@/lib/server/serialize";
import { rubricInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const snap = await rubricsCol(uid).doc((await params).id).get();
    if (!snap.exists) throw new HttpError(404, "평가 기준을 찾을 수 없습니다.");
    return NextResponse.json({ rubric: serializeRubric(snap) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const ref = rubricsCol(uid).doc((await params).id);
    const input = rubricInputSchema.parse(await req.json());
    if (!(await ref.get()).exists) throw new HttpError(404, "평가 기준을 찾을 수 없습니다.");
    await ref.update({ ...input, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ rubric: serializeRubric(await ref.get()) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    // 기존 평가 결과는 기준 스냅샷을 따로 저장하므로 삭제해도 그대로 남습니다.
    await rubricsCol(uid).doc((await params).id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
