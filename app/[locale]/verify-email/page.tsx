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
import { useSession } from "@/lib/auth-client";
import { CodeInput } from "@/components/ui/code-input";

export default function VerifyEmailPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const { refetch } = useSession();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerified, setIsVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const codeInputRef = useCallback((el: HTMLInputElement) => {
    if (el) el.focus();
  }, []);

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
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("invalidCode"));
        return;
      }

      toast.success(data.message);
      setIsVerified(true);

      // Refresh session and auto-login
      await refetch();

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      toast.error("An error occurred during verification");
      console.error(error);
    }
  }, [code, email, router, refetch, t]);

  const [handleVerify, verifyLoading] = useLoadingAction(doVerify);

  const doResend = useCallback(async () => {
    if (!email) {
      toast.error("Email not found");
      return;
    }

    setResendLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to resend code");
        return;
      }

      setCode(["", "", "", "", "", ""]);
      toast.success(data.message || t("codeSent"));
      
      // Start 60 second countdown
      setResendCountdown(60);
    } catch (error) {
      toast.error("An error occurred while resending");
      console.error(error);
    } finally {
      setResendLoading(false);
    }
  }, [email, t]);

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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t("verifyEmail")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t("verifyEmailMessage")}</p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{tc("loading")}...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("verificationCode")}</CardTitle>
          <CardDescription>
            {t("verifyEmailDesc", { email })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Code Input - supports full paste */}
          <CodeInput
            ref={codeInputRef}
            value={code}
            onChange={setCode}
            onSubmit={handleVerify}
            disabled={verifyLoading}
            length={6}
          />

          {/* Verify Button */}
          <Button
            onClick={() => handleVerify()}
            disabled={verifyLoading || code.join("").length !== 6}
            className="w-full"
          >
            {verifyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("verify")}
          </Button>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t("didNotReceive")}
              <Button
                variant="link"
                size="sm"
                onClick={doResend}
                disabled={resendLoading || resendCountdown > 0}
                className="ml-1 h-auto p-0"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    {t("resending")}
                  </>
                ) : resendCountdown > 0 ? (
                  `${t("resendCode")} (${resendCountdown}s)`
                ) : (
                  t("resendCode")
                )}
              </Button>
            </p>
          </div>

          {/* Back to Sign In */}
          <div className="text-center">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-xs">
                ← {t("backToSignIn")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
