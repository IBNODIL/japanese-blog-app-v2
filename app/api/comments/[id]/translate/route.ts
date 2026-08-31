import { NextRequest, NextResponse } from "next/server";
import { translateComment } from "@/lib/translation/translateComment";

const SUPPORTED_LANGUAGES = ["uz", "en", "ja", "ru"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang");

  if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) {
    return NextResponse.json(
      { error: "Invalid language. Supported: uz, en, ja, ru" },
      { status: 400 }
    );
  }

  const result = await translateComment(id, lang as "uz" | "en" | "ja" | "ru");

  if (!result) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
