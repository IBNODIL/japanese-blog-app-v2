import { NextResponse } from "next/server";

export async function GET() {
  // Debug endpoint for search functionality
  return NextResponse.json({
    message: "Search debug endpoint",
    timestamp: new Date().toISOString(),
  });
}
