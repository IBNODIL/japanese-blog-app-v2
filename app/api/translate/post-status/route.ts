/**
 * GET /api/translate/post-status
 * Get translation status for a post
 * Query params: postId
 */

import { NextRequest, NextResponse } from "next/server";
import { getPostTranslationStatus } from "@/lib/translation/saveTranslations";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    // Validate input
    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    // Get translation status
    const status = await getPostTranslationStatus(postId);

    if (!status) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching translation status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch translation status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
