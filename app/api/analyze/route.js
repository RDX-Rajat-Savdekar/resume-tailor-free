
import { NextResponse } from "next/server";
import { analyzeResumeVsJD } from "@/lib/analyze";

export async function POST(req) {
  try {
    const body = await req.json();
    const resumeText = (body?.resumeText || "").slice(0, 100000);
    const jdText = (body?.jdText || "").slice(0, 100000);
    if (!resumeText || !jdText) {
      return NextResponse.json({ error: "Missing resumeText or jdText" }, { status: 400 });
    }
    const result = analyzeResumeVsJD({ resumeText, jdText });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
