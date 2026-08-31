"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLoadingAction } from "@/hooks/use-loading-action";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const email = searchParams.get("email") || sessionStorage.getItem("resetEmail") || "";
  const code = searchParams.get("code") || sessionStorage.getItem("resetCode") || "";
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const doResetPassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      setError("Both password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!email || !code) {
      setError("Invalid reset session. Please start over.");
      return;
    }

    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          code, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to reset password");
        setStatus("error");
        return;
      }

      setStatus("success");
      toast.success("Password reset successfully!");
      
      // Clear session storage
      sessionStorage.removeItem("resetEmail");
      sessionStorage.removeItem("resetCode");
      sessionStorage.removeItem("resetVerified");
      
      // Redirect to sign-in page after 2 seconds
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setError("An error occurred. Please try again.");
      setStatus("error");
    }
  }, [newPassword, confirmPassword, email, code, router]);

  const [handleResetPassword, loading] = useLoadingAction(doResetPassword);

  if (status === "success") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center border-border shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-2">
              <img src="/logo.png" alt="UZJTA" className="h-16 w-16 mx-auto object-contain" />
            </div>
            <CardTitle>{t("passwordResetSuccess")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("passwordResetSuccessDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center border-border shadow-lg">
        <CardHeader>
          <div className="mx-auto mb-2">
            <img src="/logo.png" alt="UZJTA" className="h-16 w-16 mx-auto object-contain" />
          </div>
          <CardTitle>{t("resetPassword")}</CardTitle>
          <CardDescription>{t("enterNewPassword")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("newPassword")}</Label>
            <PasswordInput
              id="newPassword"
              placeholder={t("enterPassword")}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
              }}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder={t("confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950 p-3 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => handleResetPassword()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("resetPassword")}
          </Button>
        </CardContent>

        <CardFooter className="justify-center">
          <Link href="/sign-in" className="text-sm text-primary hover:underline">
            {t("backToSignIn")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
