"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Send,
  Camera,
  Share2,
  Headphones,
} from "lucide-react";

interface FooterLink {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  order: number;
}

const defaultSocialLinks = [
  {
    icon: Send,
    href: "https://t.me/uzjta",
    label: "Telegram",
    color: "hover:text-blue-500",
  },
  {
    icon: Camera,
    href: "https://instagram.com/uzjta",
    label: "Instagram",
    color: "hover:text-pink-500",
  },
  {
    icon: Share2,
    href: "https://facebook.com/uzjta",
    label: "Facebook",
    color: "hover:text-blue-600",
  },
  {
    icon: Headphones,
    href: "mailto:support@uzjta.uz",
    label: "Support",
    color: "hover:text-primary",
  },
];

export function Footer() {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  // Hide footer on authentication pages
  const authRoutes = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email"];
  const isAuthPage = authRoutes.some((route) => pathname.includes(route));
  
  useEffect(() => {
    fetchFooterLinks();
  }, []);

  const fetchFooterLinks = async () => {
    try {
      const res = await fetch("/api/admin/footer-links");
      if (res.ok) {
        const data = await res.json();
        setFooterLinks(data.sort((a: FooterLink, b: FooterLink) => a.order - b.order));
      }
    } catch (error) {
      console.error("Failed to fetch footer links:", error);
    } finally {
      setLinksLoaded(true);
    }
  };

  if (isAuthPage) return null;

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
          {/* About Section */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3 sm:mb-4">
              <Image 
                src="/logo.png" 
                alt="UZJTA" 
                width={40} 
                height={40} 
                className="object-contain w-9 h-9 sm:w-10 sm:h-10"
              />
              <h3 className="text-lg font-bold text-primary">UZJTA</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("about")}
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t("quickLinks")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link href="/posts" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("allPosts")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Links / Follow Us */}
          <div className="text-center md:text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t("followUs")}</h3>
            <div className="flex gap-4 justify-center md:justify-start">
              {linksLoaded && footerLinks.length > 0 ? (
                footerLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="text-muted-foreground transition-colors hover:text-foreground p-1"
                    title={link.label}
                  >
                    {link.icon ? (
                      <img src={link.icon} alt={link.label} className="h-5 w-5" />
                    ) : (
                      <span className="h-5 w-5 flex items-center justify-center">•</span>
                    )}
                  </a>
                ))
              ) : (
                defaultSocialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className={`text-muted-foreground transition-colors p-1 ${social.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border mt-6 sm:mt-8 pt-6 sm:pt-8">
          {/* Bottom */}
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between text-center md:text-left">
            <p className="text-xs text-muted-foreground">
              {t("copyright", { year: currentYear })}
            </p>
            <div className="flex gap-4 sm:gap-6 justify-center md:justify-end text-xs">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("privacyPolicy")}
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("termsOfService")}
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("contact")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
