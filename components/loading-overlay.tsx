"use client";

import { useTranslations } from "next-intl";
import "./loading-overlay.css";

export function LoadingOverlay({ isOpen }: { isOpen: boolean }) {
  const t = useTranslations("common");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg font-semibold text-foreground">
            {t("publishing")}
            <span className="loading-dots inline-block w-8">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
