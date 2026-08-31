import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

// Helper function to generate 6-digit code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Generate new verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old verification codes for this email to prevent spam
    await prisma.verification.deleteMany({
      where: { identifier: email.toLowerCase() },
    });

    // Store verification code
    await prisma.verification.create({
      data: {
        identifier: email.toLowerCase(),
        value: code,
        expiresAt,
      },
    });

    // Send email
    try {
      await sendVerificationEmail({
        email,
        name: user.name,
        code,
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Delete the verification code if email fails
      await prisma.verification.deleteMany({
        where: { identifier: email.toLowerCase() },
      });
      
      return NextResponse.json(
        { message: "Failed to send verification email. Please check your email configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification code sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Send verification code error:", error);
    return NextResponse.json(
      { message: "An error occurred while sending the verification code" },
      { status: 500 }
    );
  }
}
