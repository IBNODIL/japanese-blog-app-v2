import { NextResponse } from "next/server";
import { getPublicTags } from "@/lib/cache";

export async function GET() {
  try {
    const tags = await getPublicTags();

    return NextResponse.json({
      tags,
      total: tags.length,
    });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
