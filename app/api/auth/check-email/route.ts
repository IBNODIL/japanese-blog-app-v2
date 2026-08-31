import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if email exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return NextResponse.json({
      exists: !!user,
    });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json(
      { message: "An error occurred while checking email" },
      { status: 500 }
    );
  }
}
