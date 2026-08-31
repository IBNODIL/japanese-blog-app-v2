/**
 * GET /api/translate/comment
 * Translate a comment to a requested language
 * Query params: commentId, language
 */

import { NextRequest, NextResponse } from "next/server";
import { translateComment } from "@/lib/translation/translateComment";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");
    const language = searchParams.get("language");

    // Validate input
    if (!commentId) {
      return NextResponse.json(
        { error: "commentId is required" },
        { status: 400 }
      );
    }

    if (!language || !["uz", "en", "ja", "ru"].includes(language)) {
      return NextResponse.json(
        { error: "Valid language (uz, en, ja, ru) is required" },
        { status: 400 }
      );
    }

    // Translate comment
    const translatedComment = await translateComment(
      commentId,
      language as "uz" | "en" | "ja" | "ru"
    );

    if (!translatedComment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: translatedComment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      {
        error: "Failed to translate comment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
