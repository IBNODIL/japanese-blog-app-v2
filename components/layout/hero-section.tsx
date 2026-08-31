"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import Image from "next/image";

interface HeroTranslations {
  subtitle: string | null;
  welcome: string | null;
  description: string | null;
  explorePosts: string;
  joinCommunity: string;
}

interface HeroSectionProps {
  translations: HeroTranslations;
}

export function HeroSection({ translations }: HeroSectionProps) {
  const { data: session } = useSession();

  return (
    <section className="relative mb-10 sm:mb-16 overflow-hidden rounded-2xl border border-border bg-linear-to-br from-card via-card to-card">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/4 -left-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative px-4 py-10 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <Image
              src="/logo.png"
              alt="UZJTA"
              width={128}
              height={128}
              className="object-contain w-24 h-24 sm:w-32 sm:h-32"
              priority
            />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs sm:text-sm font-medium text-primary sm:px-4 sm:py-1.5">
            {translations.subtitle}
          </div>
          <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl sm:mb-6">
            {translations.welcome}
          </h1>
          <p className="mx-auto mb-7 max-w-2xl text-sm text-muted-foreground leading-relaxed sm:text-lg sm:mb-10">
            {translations.description}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row">
            <Link href="#posts" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 text-sm px-6 w-full sm:text-base sm:px-8">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                {translations.explorePosts}
              </Button>
            </Link>
            {!session && (
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="gap-2 text-sm px-6 w-full sm:text-base sm:px-8">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  {translations.joinCommunity}
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
