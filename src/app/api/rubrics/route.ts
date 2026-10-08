import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, requireTeacher } from "@/lib/server/auth";
import { rubricsCol } from "@/lib/server/firebase-admin";
import { serializeRubric } from "@/lib/server/serialize";
import { rubricInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { uid } = await requireTeacher(req);
    const snap = await rubricsCol(uid).orderBy("updatedAt", "desc").get();
    return NextResponse.json({ rubrics: snap.docs.map(serializeRubric) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { uid } = await requireTeacher(req);
    const input = rubricInputSchema.parse(await req.json());
    const ref = rubricsCol(uid).doc();
    await ref.set({ ...input, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ rubric: serializeRubric(await ref.get()) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
