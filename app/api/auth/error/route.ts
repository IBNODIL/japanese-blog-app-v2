import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");

  // Log the error for debugging
  console.error("[Auth Error]", error);

  // Redirect to home with error in query or to a specific error page
  return NextResponse.redirect(
    new URL(`/?authError=${encodeURIComponent(error || "Unknown error")}`, request.url)
  );
}
