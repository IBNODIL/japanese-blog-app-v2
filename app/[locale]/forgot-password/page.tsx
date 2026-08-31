"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLoadingAction } from "@/hooks/use-loading-action";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const doSendResetCode = useCallback(async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError("Account with this email does not exist");
        } else {
          setError(data.message || "Failed to send reset code");
        }
        setStatus("error");
        return;
      }

      setStatus("sent");
      toast.success("Reset code sent to your email!");
      // Store email in session storage for next step
      sessionStorage.setItem("resetEmail", email.toLowerCase());
      
      // Redirect to verify reset code page after 2 seconds
      setTimeout(() => {
        router.push(`/verify-reset-code?email=${encodeURIComponent(email.toLowerCase())}`);
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setError("An error occurred. Please try again.");
      setStatus("error");
    }
  }, [email, router]);

  const [handleSendResetCode, loading] = useLoadingAction(doSendResetCode);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center border-border shadow-lg">
        <CardHeader>
          <div className="mx-auto mb-2">
            <img src="/logo.png" alt="UZJTA" className="h-16 w-16 mx-auto object-contain" />
          </div>
          <CardTitle>{t("forgotPassword")}</CardTitle>
          <CardDescription>{t("resetPasswordDesc")}</CardDescription>
        </CardHeader>

        {status === "sent" ? (
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("resetCodeSent")}
            </p>
            <p className="text-sm font-medium">{email}</p>
          </CardContent>
        ) : (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
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
              onClick={() => handleSendResetCode()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("sendResetCode")}
            </Button>
          </CardContent>
        )}

        <CardFooter className="justify-center">
          <Link href="/sign-in" className="text-sm text-primary hover:underline">
            {t("backToSignIn")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
