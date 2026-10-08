import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminAuth } from "./firebase-admin";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Teacher = { uid: string; email: string | null; name: string | null };

function allowedEmails(): string[] {
  return (process.env.ALLOWED_TEACHER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Authorization: Bearer <Firebase ID 토큰>을 검증하고 교사 권한을 확인합니다. */
export async function requireTeacher(req: Request): Promise<Teacher> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) throw new HttpError(401, "로그인이 필요합니다.");

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(match[1]);
  } catch {
    throw new HttpError(401, "로그인 정보가 만료되었거나 올바르지 않습니다.");
  }

  const allowed = allowedEmails();
  const email = decoded.email?.toLowerCase() ?? null;
  if (allowed.length > 0 && (!email || !decoded.email_verified || !allowed.includes(email))) {
    throw new HttpError(403, "이 계정은 교사 사용 권한이 없습니다. 관리자에게 문의하세요.");
  }

  return { uid: decoded.uid, email, name: (decoded.name as string | undefined) ?? null };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}
