"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("errors");
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-bold mb-2">{t("pageNotFound")}</h2>
          <p className="text-muted-foreground">
            {t("pageNotFoundDescription")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="flex-1 sm:flex-initial">
            <Button variant="default" size="lg" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              {t("goHome")}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={handleGoBack}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("goBack")}
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t">
          <p className="text-xs text-muted-foreground mb-4">
            {t("needHelp")}
          </p>
          <a
            href="mailto:support@uzjta.uz"
            className="text-primary hover:underline text-sm"
          >
            support@uzjta.uz
          </a>
        </div>
      </div>
    </div>
  );
}
