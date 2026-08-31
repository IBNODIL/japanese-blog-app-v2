import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isSuperAdmin } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Update a footer link (super admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { label, url, icon, order } = await request.json();

    const link = await prisma.footerLink.update({
      where: { id },
      data: {
        ...(label && { label }),
        ...(url && { url }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error("Failed to update footer link:", error);
    return NextResponse.json(
      { error: "Failed to update footer link" },
      { status: 500 }
    );
  }
}

// Delete a footer link (super admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.footerLink.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Footer link deleted successfully" });
  } catch (error) {
    console.error("Failed to delete footer link:", error);
    return NextResponse.json(
      { error: "Failed to delete footer link" },
      { status: 500 }
    );
  }
}
