"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { EditableHomepageContent } from "@/components/dashboard/editable-homepage-content";
import Image from "next/image";

interface HomepageContent {
  id: string;
  language: string;
  title: string;
  subtitle: string;
  description: string | null;
}

const LANGUAGES = [
  { code: "uz", name: "Uzbek (UZ)" },
  { code: "en", name: "English (EN)" },
  { code: "ru", name: "Russian (RU)" },
  { code: "ja", name: "Japanese (JA)" },
];

export default function HomepagePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [content, setContent] = useState<Record<string, HomepageContent>>({});
  const [loading, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState("en");

  // Check admin access
  useEffect(() => {
    if (!isPending && (!session?.user || !(["ADMIN", "SUPER_ADMIN"].includes((session.user as Record<string, unknown>).role as string)))) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/homepage-content");
      if (!res.ok) throw new Error("Failed to fetch content");

      const data: HomepageContent[] = await res.json();
      const contentMap: Record<string, HomepageContent> = {};
      
      // Initialize all languages with default content if not found
      LANGUAGES.forEach((lang) => {
        const found = data.find((item) => item.language === lang.code);
        if (found) {
          contentMap[lang.code] = found;
        } else {
          contentMap[lang.code] = {
            id: "",
            language: lang.code,
            title: "Welcome to UZJTA",
            subtitle: "Japanese Language Teachers Association",
            description: "Join our community to share knowledge and resources about Japanese language education.",
          };
        }
      });
      
      setContent(contentMap);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to fetch homepage content");
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session?.user || !(["SUPER_ADMIN"].includes((session.user as Record<string, unknown>).role as string))) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-start">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Access Denied</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Only Super Admins can manage homepage content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("homepageManagement")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("editContentDescription")}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <h3 className="font-semibold mb-2">{t("howToUse")}</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ {t("howToUseHover")}</li>
                <li>✓ {t("howToUseClick")}</li>
                <li>✓ {t("howToUseSave")}</li>
                <li>✓ {t("howToUseAutoTranslate")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Tabs */}
      <Tabs value={currentLanguage} onValueChange={setCurrentLanguage} className="w-full flex flex-col">
        <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto border-b">
          {LANGUAGES.map((lang) => (
            <TabsTrigger key={lang.code} value={lang.code}>
              {lang.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {LANGUAGES.map((lang) => (
          <TabsContent key={lang.code} value={lang.code} className="space-y-6">
            {/* Homepage Preview */}
            <Card className="border-2">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="text-lg">
                  {lang.name} - {t("homepagePreview")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                {/* Hero Section Mockup */}
                <section className="relative mb-12 overflow-hidden rounded-2xl border border-border bg-linear-to-br from-card via-card to-card">
                  {/* Animated Background */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-1/4 -left-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
                  </div>

                  <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
                    <div className="mx-auto max-w-3xl text-center">
                      {/* Logo */}
                      <div className="mb-8 flex justify-center">
                        <Image
                          src="/logo.png"
                          alt="UZJTA"
                          width={100}
                          height={100}
                          className="object-contain"
                        />
                      </div>

                      {/* Editable Content */}
                      <EditableHomepageContent
                        content={content}
                        currentLanguage={lang.code}
                        onContentUpdated={fetchContent}
                      />
                    </div>
                  </div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Content Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("contentSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <Badge>{lang.code.toUpperCase()}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {t("lastUpdated", { status: content[lang.code]?.id ? t("saved") : t("notInitialized") })}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("titleField")}</p>
                    <p className="text-xs break-words">
                      {content[lang.code]?.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("subtitleField")}</p>
                    <p className="text-xs break-words">
                      {content[lang.code]?.subtitle}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("descriptionField")}</p>
                    <p className="text-xs break-words line-clamp-2">
                      {content[lang.code]?.description || "(empty)"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
