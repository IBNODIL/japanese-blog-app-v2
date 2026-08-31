import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DEVELOPMENT ONLY: Helper endpoint to verify users without email verification
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { message: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Mark user as verified by updating emailVerified
    const updated = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });

    // Delete any existing verification codes
    await prisma.verification.deleteMany({
      where: { identifier: email.toLowerCase() },
    });

    return NextResponse.json({
      message: "User verified successfully",
      user: updated,
      success: true,
    });
  } catch (error) {
    console.error("Dev verify error:", error);
    return NextResponse.json(
      { message: "An error occurred" },
      { status: 500 }
    );
  }
}
