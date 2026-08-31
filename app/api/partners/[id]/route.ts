import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Update a partner (super admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { name, image, text, link, order } = await request.json();

    // Verify partner exists
    const existingPartner = await prisma.partner.findUnique({
      where: { id },
    });

    if (!existingPartner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(image && { image }),
        ...(text !== undefined && { text: text || null }),
        ...(link !== undefined && { link: link || null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("Failed to update partner:", error);
    return NextResponse.json(
      { error: "Failed to update partner" },
      { status: 500 }
    );
  }
}

// Delete a partner (super admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify partner exists
    const existingPartner = await prisma.partner.findUnique({
      where: { id },
    });

    if (!existingPartner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    // Delete image file if it's a local upload
    if (existingPartner.image && existingPartner.image.startsWith("/uploads/")) {
      try {
        const fileName = existingPartner.image.split("/").pop();
        if (fileName) {
          const filePath = join(process.cwd(), "public", "uploads", fileName);
          if (existsSync(filePath)) {
            await unlink(filePath);
          }
        }
      } catch (error) {
        console.error("Failed to delete image file:", error);
        // Don't fail the delete operation if image file deletion fails
      }
    }

    await prisma.partner.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Partner deleted successfully" });
  } catch (error) {
    console.error("Failed to delete partner:", error);
    return NextResponse.json(
      { error: "Failed to delete partner" },
      { status: 500 }
    );
  }
}
