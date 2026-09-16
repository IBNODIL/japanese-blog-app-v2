import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getPublicPartners, CACHE_TAGS } from "@/lib/cache";

// Get all partners
export async function GET() {
  try {
    const partners = await getPublicPartners();
    return NextResponse.json(partners);
  } catch (error) {
    console.error("Failed to fetch partners:", error);
    return NextResponse.json(
      { error: "Failed to fetch partners" },
      { status: 500 }
    );
  }
}

// Create a new partner (super admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, image, text, link, order } = await request.json();

    if (!name || !image) {
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.create({
      data: {
        name,
        image,
        text: text || null,
        link: link || null,
        order: order || 0,
      },
    });

    revalidateTag(CACHE_TAGS.partners, "max");
    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("Failed to create partner:", error);
    return NextResponse.json(
      { error: "Failed to create partner" },
      { status: 500 }
    );
  }
}
