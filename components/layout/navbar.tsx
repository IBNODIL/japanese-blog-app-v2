"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Sun,
  Moon,
  Menu,
  PenSquare,
  Bell,
  Bookmark,
  LayoutDashboard,
  LogOut,
  Search,
  Globe,
  History,
  Users,
  Users2,
  Settings,
  Home,
} from "lucide-react";
import { useParams } from "next/navigation";
import Image from "next/image";
import type { Locale } from "@/i18n/routing";


const localeLabels: Record<Locale, { flag: string; name: string }> = {
  uz: { flag: "🇺🇿", name: "O'zbek" },
  ja: { flag: "🇯🇵", name: "日本語" },
  en: { flag: "🇬🇧", name: "English" },
  ru: { flag: "🇷🇺", name: "Русский" },
};

export function Navbar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as Locale) || "uz";
  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as Locale });
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const navLinkClass = (href: string) =>
    `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
      pathname === href
        ? "bg-primary/10 text-primary"
        : "text-foreground hover:bg-muted"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-3">
          <div className="relative h-9 w-9">
            <Image 
              src="/logo.png" 
              alt="UZJTA" 
              width={36} 
              height={36} 
              className="object-contain w-full h-full"
            />
          </div>
          <span className="hidden text-lg font-bold tracking-tight text-primary sm:inline-block">UZJTA</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden flex-1 items-center space-x-1 md:flex">
          <Link href="/posts">
            <Button
              variant="ghost"
              size="sm"
            >
              <Search className="mr-1 h-4 w-4" />
              {t("common.search")}
            </Button>
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
              <Globe className="h-4 w-4" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(localeLabels) as Locale[]).map((loc) => (
                <DropdownMenuItem key={loc} onClick={() => switchLocale(loc)}>
                  {localeLabels[loc].flag} {localeLabels[loc].name}{" "}
                  {locale === loc && "✓"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {session?.user ? (
            <>
              {/* Write Button - Admin and Super Admin */}
              {((session.user as Record<string, unknown>).role === "ADMIN" || (session.user as Record<string, unknown>).role === "SUPER_ADMIN") && (
                <Link href="/dashboard/create">
                  <Button variant="ghost" size="sm" className="hidden md:flex">
                    <PenSquare className="mr-1 h-4 w-4" />
                    {t("nav.write")}
                  </Button>
                </Link>
              )}

              {/* Notifications */}
              <Link href="/dashboard/notifications">
                <Button variant="ghost" size="icon">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" className="relative h-8 w-8 rounded-full p-0" />}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={session.user.image || ""}
                      alt={session.user.name}
                    />
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {((session.user as Record<string, unknown>).role === "ADMIN" || (session.user as Record<string, unknown>).role === "SUPER_ADMIN") && (
                    <>
                      <DropdownMenuItem render={<Link href="/dashboard" />}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t("common.dashboard")}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard/posts" />}>
                        <PenSquare className="mr-2 h-4 w-4" />
                        {t("nav.myPosts")}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard/history" />}>
                        <History className="mr-2 h-4 w-4" />
                        {t("dashboard.history")}
                      </DropdownMenuItem>
                    </>
                  )}
                  {(session.user as Record<string, unknown>).role === "SUPER_ADMIN" && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {t("dashboard.superAdminTools") || "Super Admin Tools"}
                      </div>
                      <DropdownMenuItem render={<Link href="/dashboard/users" />}>
                        <Users className="mr-2 h-4 w-4" />
                        {t("dashboard.manageUsers") || "Manage Users"}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard/partners" />}>
                        <Users2 className="mr-2 h-4 w-4" />
                        {t("dashboard.partnersManagement")}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard/homepage" />}>
                        <Home className="mr-2 h-4 w-4" />
                        {t("dashboard.manageHomepage") || "Manage Homepage"}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard/footer" />}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t("dashboard.manageFooter") || "Manage Footer"}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/dashboard/bookmarks" />}>
                    <Bookmark className="mr-2 h-4 w-4" />
                    {t("nav.bookmarks")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("common.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center space-x-2 md:flex">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  {t("common.signIn")}
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">{t("common.signUp")}</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[300px] flex flex-col p-0 gap-0">

              {/* Sheet Header */}
              <SheetHeader className="flex-row items-center gap-3 px-4 py-3 border-b border-border space-y-0">
                <Image src="/logo.png" alt="UZJTA" width={28} height={28} className="object-contain shrink-0" />
                <SheetTitle className="text-base font-bold text-primary">UZJTA</SheetTitle>
              </SheetHeader>

              {/* User Info (when signed in) */}
              {session?.user && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={session.user.image || ""} alt={session.user.name} />
                    <AvatarFallback className="text-sm">
                      {session.user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                </div>
              )}

              {/* Scrollable Nav */}
              <nav className="flex-1 overflow-y-auto py-2">

                {/* Main Links */}
                <div className="px-2 space-y-0.5">
                  <Link href="/" className={navLinkClass("/")}>
                    <Home className="h-4 w-4 shrink-0" />
                    {t("nav.home")}
                  </Link>
                  <Link href="/posts" className={navLinkClass("/posts")}>
                    <Search className="h-4 w-4 shrink-0" />
                    {t("common.search")}
                  </Link>
                </div>

                {session?.user ? (
                  <>
                    {/* User links */}
                    <div className="mx-4 my-2 border-t border-border" />
                    <div className="px-2 space-y-0.5">
                      <Link href="/dashboard/notifications" className={navLinkClass("/dashboard/notifications")}>
                        <Bell className="h-4 w-4 shrink-0" />
                        {t("nav.notifications")}
                      </Link>
                      <Link href="/dashboard/bookmarks" className={navLinkClass("/dashboard/bookmarks")}>
                        <Bookmark className="h-4 w-4 shrink-0" />
                        {t("nav.bookmarks")}
                      </Link>
                    </div>

                    {/* Admin links */}
                    {((session.user as Record<string, unknown>).role === "ADMIN" || (session.user as Record<string, unknown>).role === "SUPER_ADMIN") && (
                      <>
                        <div className="mx-4 my-2 border-t border-border" />
                        <p className="px-5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("common.dashboard")}
                        </p>
                        <div className="px-2 space-y-0.5">
                          <Link href="/dashboard" className={navLinkClass("/dashboard")}>
                            <LayoutDashboard className="h-4 w-4 shrink-0" />
                            {t("common.dashboard")}
                          </Link>
                          <Link href="/dashboard/create" className={navLinkClass("/dashboard/create")}>
                            <PenSquare className="h-4 w-4 shrink-0" />
                            {t("nav.write")}
                          </Link>
                          <Link href="/dashboard/posts" className={navLinkClass("/dashboard/posts")}>
                            <PenSquare className="h-4 w-4 shrink-0" />
                            {t("nav.myPosts")}
                          </Link>
                          <Link href="/dashboard/history" className={navLinkClass("/dashboard/history")}>
                            <History className="h-4 w-4 shrink-0" />
                            {t("dashboard.history")}
                          </Link>
                        </div>
                      </>
                    )}

                    {/* Super Admin links */}
                    {(session.user as Record<string, unknown>).role === "SUPER_ADMIN" && (
                      <>
                        <div className="mx-4 my-2 border-t border-border" />
                        <p className="px-5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("dashboard.superAdminTools")}
                        </p>
                        <div className="px-2 space-y-0.5">
                          <Link href="/dashboard/users" className={navLinkClass("/dashboard/users")}>
                            <Users className="h-4 w-4 shrink-0" />
                            {t("dashboard.manageUsers")}
                          </Link>
                          <Link href="/dashboard/partners" className={navLinkClass("/dashboard/partners")}>
                            <Users2 className="h-4 w-4 shrink-0" />
                            {t("dashboard.partnersManagement")}
                          </Link>
                          <Link href="/dashboard/homepage" className={navLinkClass("/dashboard/homepage")}>
                            <Home className="h-4 w-4 shrink-0" />
                            {t("dashboard.manageHomepage")}
                          </Link>
                          <Link href="/dashboard/footer" className={navLinkClass("/dashboard/footer")}>
                            <Settings className="h-4 w-4 shrink-0" />
                            {t("dashboard.manageFooter")}
                          </Link>
                        </div>
                      </>
                    )}

                    {/* Sign Out */}
                    <div className="mx-4 mt-2 pt-2 border-t border-border">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {t("common.signOut")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-4 my-3 border-t border-border" />
                    <div className="px-3 space-y-2">
                      <Link
                        href="/sign-in"
                        className="flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium border border-border hover:bg-muted transition-colors"
                      >
                        {t("common.signIn")}
                      </Link>
                      <Link
                        href="/sign-up"
                        className="flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        {t("common.signUp")}
                      </Link>
                    </div>
                  </>
                )}

              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

    </header>
  );
}
