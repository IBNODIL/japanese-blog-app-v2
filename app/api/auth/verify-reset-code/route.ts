import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { message: "Email and code are required" },
        { status: 400 }
      );
    }

    // Find reset code record
    const resetCode = await prisma.verification.findFirst({
      where: {
        identifier: `reset_${email.toLowerCase()}`,
        value: code,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetCode) {
      return NextResponse.json(
        { message: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Reset code verified successfully",
      success: true,
    });
  } catch (error) {
    console.error("Verify reset code error:", error);
    return NextResponse.json(
      { message: "An error occurred while verifying the reset code" },
      { status: 500 }
    );
  }
}
