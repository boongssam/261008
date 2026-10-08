import { NextResponse } from "next/server";
import { errorResponse, requireTeacher } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const teacher = await requireTeacher(req);
    return NextResponse.json(teacher);
  } catch (err) {
    return errorResponse(err);
  }
}
