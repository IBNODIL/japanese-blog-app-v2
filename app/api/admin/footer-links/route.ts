import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isSuperAdmin } from "@/lib/session";

// Get all footer links
export async function GET() {
  try {
    const links = await prisma.footerLink.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Failed to fetch footer links:", error);
    return NextResponse.json(
      { error: "Failed to fetch footer links" },
      { status: 500 }
    );
  }
}

// Create a new footer link (super admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { label, url, icon, order } = await request.json();

    if (!label || !url) {
      return NextResponse.json(
        { error: "label and url are required" },
        { status: 400 }
      );
    }

    const link = await prisma.footerLink.create({
      data: {
        label,
        url,
        icon: icon || null,
        order: order || 0,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Failed to create footer link:", error);
    return NextResponse.json(
      { error: "Failed to create footer link" },
      { status: 500 }
    );
  }
}
