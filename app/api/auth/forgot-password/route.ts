import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

// Helper function to generate 6-digit code
function generateResetCode(): string {
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
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Account with this email does not exist" },
        { status: 404 }
      );
    }

    // Generate new reset code
    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old reset codes for this email
    await prisma.verification.deleteMany({
      where: { 
        identifier: `reset_${email.toLowerCase()}` 
      },
    });

    // Store reset code with "reset_" prefix to distinguish from email verification codes
    await prisma.verification.create({
      data: {
        identifier: `reset_${email.toLowerCase()}`,
        value: code,
        expiresAt,
      },
    });

    // Send email with reset code
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
        where: { identifier: `reset_${email.toLowerCase()}` },
      });
      
      return NextResponse.json(
        { message: "Failed to send reset code email. Please check your email configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Reset code sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "An error occurred while sending the reset code" },
      { status: 500 }
    );
  }
}
