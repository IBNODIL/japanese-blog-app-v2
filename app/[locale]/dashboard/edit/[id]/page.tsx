"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, X, Eye, Sparkles, PencilLine, AlertTriangle, CheckCircle2 } from "lucide-react";
import { GoBackButton } from "@/components/go-back-button";
import { LoadingOverlay } from "@/components/loading-overlay";

const LANGUAGES = [
  { code: "uz", flag: "🇺🇿", label: "O'zbek" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];

type TranslationStatus =
  | "ORIGINAL"
  | "AUTO_TRANSLATED"
  | "MANUAL_TRANSLATED"
  | "PENDING"
  | "FAILED";

interface PostMeta {
  id: string;
  language: string;
  published: boolean;
}

interface TranslationData {
  title: string;
  content: unknown;
  slug: string;
  coverImage: string | null;
  tags: string[];
  translationStatus: TranslationStatus;
  isOriginal: boolean;
}

// Per-tab editable state, plus a loaded flag so we know whether the tab's
// data has been fetched yet (lazy-loaded the first time it's opened).
interface TabState extends TranslationData {
  loaded: boolean;
  contentJson: string; // stringified TipTap JSON for the editor
  tagInput: string;
  dirty: boolean;
}

function emptyTabState(): TabState {
  return {
    title: "",
    content: null,
    slug: "",
    coverImage: null,
    tags: [],
    translationStatus: "PENDING",
    isOriginal: false,
    loaded: false,
    contentJson: "",
    tagInput: "",
    dirty: false,
  };
}

const statusBadge: Record<TranslationStatus, { label: string; className: string; icon: React.ReactNode }> = {
  ORIGINAL: { label: "Original", className: "bg-primary/10 text-primary", icon: <PencilLine className="h-3 w-3" /> },
  MANUAL_TRANSLATED: { label: "Manually edited", className: "bg-green-500/10 text-green-600 dark:text-green-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  AUTO_TRANSLATED: { label: "Auto-translated", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: <Sparkles className="h-3 w-3" /> },
  PENDING: { label: "Not translated yet", className: "bg-muted text-muted-foreground", icon: <Sparkles className="h-3 w-3" /> },
  FAILED: { label: "Translation failed", className: "bg-destructive/10 text-destructive", icon: <AlertTriangle className="h-3 w-3" /> },
};

export default function EditPostPage() {
  const t = useTranslations("post");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postMeta, setPostMeta] = useState<PostMeta | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>("uz");
  const [showPreview, setShowPreview] = useState(false);

  const [tabs, setTabs] = useState<Record<LangCode, TabState>>(() => {
    const initial = {} as Record<LangCode, TabState>;
    for (const l of LANGUAGES) initial[l.code] = emptyTabState();
    return initial;
  });

  const current = tabs[activeLang];

  const updateTab = useCallback((lang: LangCode, patch: Partial<TabState>) => {
    setTabs((prev) => ({ ...prev, [lang]: { ...prev[lang], ...patch, dirty: true } }));
  }, []);

  // Load base post metadata (which language is original, published state)
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          toast.error("Post not found");
          router.push("/dashboard/posts");
          return;
        }
        const post = await res.json();
        setPostMeta({ id: post.id, language: post.language, published: post.published });
        setActiveLang(post.language as LangCode);
      } catch {
        toast.error("Failed to load post");
      } finally {
        setFetching(false);
      }
    }
    fetchMeta();
  }, [postId, router]);

  // Lazily load each language tab's data the first time it's selected.
  const loadTab = useCallback(
    async (lang: LangCode) => {
      if (tabs[lang].loaded) return;
      try {
        const res = await fetch(`/api/posts/${postId}/translate?lang=${lang}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Failed to load ${lang.toUpperCase()} translation`);
          return;
        }
        setTabs((prev) => ({
          ...prev,
          [lang]: {
            ...prev[lang],
            title: data.title || "",
            content: data.content,
            contentJson: JSON.stringify(data.content ?? { type: "doc", content: [] }),
            slug: data.slug || "",
            coverImage: data.coverImage || null,
            tags: data.tags || [],
            translationStatus: data.translationStatus || "PENDING",
            isOriginal: !!data.isOriginal,
            loaded: true,
            dirty: false,
          },
        }));
      } catch {
        toast.error(`Failed to load ${lang.toUpperCase()} translation`);
      }
    },
    [postId, tabs]
  );

  useEffect(() => {
    if (postMeta) loadTab(activeLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postMeta, activeLang]);

  const addTag = () => {
    const trimmed = current.tagInput.trim();
    if (trimmed && !current.tags.includes(trimmed)) {
      updateTab(activeLang, { tags: [...current.tags, trimmed], tagInput: "" });
    }
  };

  const removeTag = (tag: string) => {
    updateTab(activeLang, { tags: current.tags.filter((tg) => tg !== tag) });
  };

  const handleContentChange = useCallback(
    (json: string) => {
      updateTab(activeLang, { contentJson: json });
    },
    [activeLang, updateTab]
  );

  // Save just the active language's tab via the translation-scoped endpoint.
  const saveCurrentTab = async (publishOverride?: boolean) => {
    if (!postMeta) return;

    setSaving(true);
    try {
      let parsedContent: unknown;
      try {
        parsedContent = current.contentJson ? JSON.parse(current.contentJson) : current.content;
      } catch {
        parsedContent = current.content;
      }

      const res = await fetch(`/api/posts/${postId}/translate?lang=${activeLang}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: current.title,
          content: parsedContent,
          slug: current.slug,
          coverImage: current.coverImage || "",
          tags: current.tags,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error?.fieldErrors ? JSON.stringify(data.error.fieldErrors) : data.error || "Failed to save");
        return;
      }

      updateTab(activeLang, {
        translationStatus: data.translationStatus,
        dirty: false,
      });
      setTabs((prev) => ({ ...prev, [activeLang]: { ...prev[activeLang], dirty: false } }));

      // Publish toggle is a global (Post-level) field, handled separately.
      if (publishOverride !== undefined && publishOverride !== postMeta.published) {
        const pubRes = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: publishOverride }),
        });
        if (pubRes.ok) {
          setPostMeta({ ...postMeta, published: publishOverride });
        }
      }

      toast.success(
        publishOverride
          ? "Published!"
          : `Saved (${LANGUAGES.find((l) => l.code === activeLang)?.label})`
      );

      if (publishOverride !== undefined) {
        router.push("/dashboard/posts");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-75 w-full" />
      </div>
    );
  }

  if (!postMeta) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GoBackButton />
          <h1 className="text-3xl font-bold">{t("editPost")}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="mr-1 h-4 w-4" />
          {t("preview")}
        </Button>
      </div>

      <Tabs
        value={activeLang}
        onValueChange={(v) => v && setActiveLang(v as LangCode)}
      >
        <TabsList>
          {LANGUAGES.map((l) => (
            <TabsTrigger key={l.code} value={l.code} className="gap-1.5">
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === postMeta.language && (
                <span className="ml-1 text-[10px] opacity-60">(original)</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {LANGUAGES.map((l) => (
          <TabsContent key={l.code} value={l.code} className="mt-4">
            {!tabs[l.code].loaded ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Translation status indicator */}
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusBadge[tabs[l.code].translationStatus].className}`}
                >
                  {statusBadge[tabs[l.code].translationStatus].icon}
                  {statusBadge[tabs[l.code].translationStatus].label}
                  {tabs[l.code].dirty && (
                    <span className="opacity-70">· unsaved changes</span>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor={`title-${l.code}`}>
                    {t("title")} <span className="text-muted-foreground text-sm">({tc("optional") || "optional"})</span>
                  </Label>
                  <Input
                    id={`title-${l.code}`}
                    value={current.title}
                    onChange={(e) => updateTab(l.code, { title: e.target.value })}
                    className="text-lg font-semibold"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor={`slug-${l.code}`}>{t("slug")}</Label>
                  <Input
                    id={`slug-${l.code}`}
                    value={current.slug}
                    onChange={(e) => updateTab(l.code, { slug: e.target.value })}
                  />
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <Label htmlFor={`coverImage-${l.code}`}>{t("coverImage")}</Label>
                  <Input
                    id={`coverImage-${l.code}`}
                    value={current.coverImage || ""}
                    onChange={(e) => updateTab(l.code, { coverImage: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  {current.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.coverImage}
                      alt="Cover preview"
                      className="mt-2 h-48 w-full rounded-lg object-cover"
                    />
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>{t("tags")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={current.tagInput}
                      onChange={(e) => updateTab(l.code, { tagInput: e.target.value })}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addTag())
                      }
                      placeholder="Add a tag..."
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  {current.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {current.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button onClick={() => removeTag(tag)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label>{t("content")}</Label>
                  {showPreview ? (
                    <div className="rounded-lg border border-border p-4">
                      <TiptapEditor key={`preview-${l.code}`} content={current.contentJson} editable={false} />
                    </div>
                  ) : (
                    <TiptapEditor
                      key={`editor-${l.code}`}
                      content={current.contentJson}
                      onChange={handleContentChange}
                      placeholder="Write your story..."
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button onClick={() => saveCurrentTab(true)} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tc("publish")}
        </Button>
        <Button
          variant="outline"
          onClick={() => saveCurrentTab()}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save {LANGUAGES.find((l) => l.code === activeLang)?.label}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          {tc("cancel")}
        </Button>
      </div>

      <LoadingOverlay isOpen={saving} />
    </div>
  );
}
