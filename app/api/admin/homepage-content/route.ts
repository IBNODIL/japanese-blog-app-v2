import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isSuperAdmin } from "@/lib/session";
import { translateText } from "@/lib/translate";

// Get all homepage content
export async function GET() {
  try {
    const content = await prisma.homepageContent.findMany({
      orderBy: { language: "asc" },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("Failed to fetch homepage content:", error);
    return NextResponse.json(
      { error: "Failed to fetch homepage content" },
      { status: 500 }
    );
  }
}

// Update homepage content (super admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { 
      language, 
      title, 
      subtitle, 
      description,
      autoTranslate = false,
      editedField = null
    } = await request.json();

    if (!language || !title || !subtitle) {
      return NextResponse.json(
        { error: "language, title, and subtitle are required" },
        { status: 400 }
      );
    }

    // Save the content for this language
    const content = await prisma.homepageContent.upsert({
      where: { language },
      update: { title, subtitle, description },
      create: { language, title, subtitle, description },
    });

    // If auto-translate is enabled, translate to other languages
    if (autoTranslate) {
      const languages = ["uz", "en", "ja", "ru"];
      const otherLanguages = languages.filter((lang) => lang !== language);

      for (const targetLanguage of otherLanguages) {
        try {
          let translatedTitle = title;
          let translatedSubtitle = subtitle;
          let translatedDescription = description;

          // Only translate the edited fields if specified
          if (editedField === "title" || !editedField) {
            translatedTitle = await translateText(title, language, targetLanguage);
          }
          if (editedField === "subtitle" || !editedField) {
            translatedSubtitle = await translateText(subtitle, language, targetLanguage);
          }
          if ((editedField === "description" || !editedField) && description) {
            translatedDescription = await translateText(description, language, targetLanguage);
          }

          await prisma.homepageContent.upsert({
            where: { language: targetLanguage },
            update: {
              ...(editedField === "title" || !editedField ? { title: translatedTitle } : {}),
              ...(editedField === "subtitle" || !editedField ? { subtitle: translatedSubtitle } : {}),
              ...(editedField === "description" || !editedField ? { description: translatedDescription } : {}),
            },
            create: {
              language: targetLanguage,
              title: translatedTitle,
              subtitle: translatedSubtitle,
              description: translatedDescription,
            },
          });
        } catch (error) {
          console.error(`Failed to auto-translate to ${targetLanguage}:`, error);
        }
      }
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error("Failed to update homepage content:", error);
    return NextResponse.json(
      { error: "Failed to update homepage content" },
      { status: 500 }
    );
  }
}
