"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLoadingAction } from "@/hooks/use-loading-action";
import { CodeInput } from "@/components/ui/code-input";

export default function VerifyResetCodePage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerified, setIsVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const doVerify = useCallback(async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      toast.error(t("invalidCode"));
      return;
    }

    if (!email) {
      toast.error("Email not found");
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("invalidCode"));
        return;
      }

      toast.success("Code verified successfully!");
      setIsVerified(true);

      // Store verified state and redirect to reset password page
      sessionStorage.setItem("resetVerified", "true");
      sessionStorage.setItem("resetEmail", email);
      sessionStorage.setItem("resetCode", fullCode);
      
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(fullCode)}`);
      }, 1500);
    } catch (error) {
      console.error("Verify error:", error);
      toast.error("An error occurred. Please try again.");
    }
  }, [code, email, router, t]);

  const [handleVerify, verifyLoading] = useLoadingAction(doVerify);

  // Resend code
  const doResendCode = useCallback(async () => {
    if (!email) {
      toast.error("Email not found");
      return;
    }

    setResendLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Reset code resent successfully!");
        setResendCountdown(60);
      } else {
        toast.error(data.message || "Failed to resend code");
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  if (isVerified) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center border-border shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-2">
              <img src="/logo.png" alt="UZJTA" className="h-16 w-16 mx-auto object-contain" />
            </div>
            <CardTitle>{t("verified")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("redirectingToReset")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <img src="/logo.png" alt="UZJTA" className="h-16 w-16 mx-auto object-contain" />
          </div>
          <CardTitle className="text-2xl">{t("verificationCode")}</CardTitle>
          <CardDescription>
            {t("enterCodeSentTo")} {email}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Code Input - supports full paste */}
          <CodeInput
            value={code}
            onChange={setCode}
            onSubmit={() => handleVerify()}
            disabled={verifyLoading}
            length={6}
          />

          <Button
            className="w-full"
            onClick={() => handleVerify()}
            disabled={verifyLoading || code.join("").length !== 6}
          >
            {verifyLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("verifyCode")}
          </Button>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t("didntReceiveCode")}
            </p>
            <Button
              variant="ghost"
              className="text-primary hover:text-primary"
              onClick={doResendCode}
              disabled={resendLoading || resendCountdown > 0}
            >
              {resendCountdown > 0
                ? `${t("resendIn")} ${resendCountdown}s`
                : t("resend")}
            </Button>
          </div>
        </CardContent>

        <div className="px-6 pb-6 text-center">
          <Link href="/sign-in" className="text-sm text-primary hover:underline">
            {t("backToSignIn")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
