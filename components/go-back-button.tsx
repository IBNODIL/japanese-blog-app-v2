"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function GoBackButton() {
  const router = useRouter();
  const t = useTranslations("common");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="gap-1"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("back")}
    </Button>
  );
}
