import { errorResponse, HttpError, requireTeacher } from "@/lib/server/auth";
import { bucket, evaluationsCol } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

/** 본인이 올린 원본 PDF를 서버를 거쳐 내려줍니다. (Storage는 클라이언트 직접 접근 차단) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireTeacher(req);
    const snap = await evaluationsCol(uid).doc((await params).id).get();
    if (!snap.exists) throw new HttpError(404, "평가 결과를 찾을 수 없습니다.");

    const [pdf] = await bucket().file(snap.get("storagePath")).download();
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(snap.get("fileName") ?? "worksheet.pdf")}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
