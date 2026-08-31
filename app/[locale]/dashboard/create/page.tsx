"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { GoBackButton } from "@/components/go-back-button";
import { LoadingOverlay } from "@/components/loading-overlay";
import slugify from "slugify";
import { createPostSchema } from "@/lib/validations";

export default function CreatePostPage() {
  const t = useTranslations("post");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "uz";
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [content, setContent] = useState("");

  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createPostSchema) as any,
    defaultValues: {
      title: "",
      slug: "",
      coverImage: "",
      language: locale,
      content: "",
    },
  });

  const handleTitleChange = (value: string) => {
    form.setValue("title", value);
    form.setValue("slug", slugify(value, { lower: true, strict: true }));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleContentChange = useCallback((json: string) => {
    setContent(json);
    form.setValue("content", json);
  }, [form]);

  const handleSubmit = async (published: boolean) => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const formData = form.getValues();

      // Parse content safely
      let parsedContent;
      try {
        parsedContent = content ? JSON.parse(content) : { type: "doc", content: [] };
      } catch {
        parsedContent = { type: "doc", content: [] };
      }

      const fallbackSlug = () =>
        `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          content: parsedContent,
          slug:
            formData.slug ||
            (formData.title ? slugify(formData.title, { lower: true, strict: true }) : fallbackSlug()),
          coverImage: formData.coverImage,
          published,
          language: formData.language,
          tags,
        }),
      });

      if (res.ok) {
        toast.success(published ? "Post published!" : "Draft saved!");
        router.push("/dashboard/posts");
      } else {
        const data = await res.json();
        // Handle validation errors
        if (data.error?.fieldErrors) {
          const errors = Object.entries(data.error.fieldErrors)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
            .join("; ");
          toast.error(errors || "Validation failed");
        } else if (data.error) {
          toast.error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        } else {
          toast.error("Failed to create post");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("An error occurred during submission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GoBackButton />
            <h1 className="text-3xl font-bold">{t("createNew")}</h1>
          </div>

        </div>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("title")} <span className="text-muted-foreground text-sm">({tc("optional")})</span></Label>
            <Input
              id="title"
              {...form.register("title")}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title... (optional)"
              className="text-lg font-semibold"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">{t("slug")}</Label>
            <Input
              id="slug"
              {...form.register("slug")}
              onChange={(e) => form.setValue("slug", e.target.value)}
              placeholder="post-slug"
            />
          </div>

          {/* Cover Image Upload */}
          <ImageUpload name="coverImage" label={t("coverImage")} />

          {/* Language */}
          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <Select
              value={form.watch("language")}
              onValueChange={(v) => v && form.setValue("language", v)}
            >
              <SelectTrigger className="w-45">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uz">🇺🇿 O&apos;zbek</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                <SelectItem value="ru">🇷🇺 Русский</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>{t("tags")}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
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

          {/* Editor */}
          <div className="space-y-2">
            <Label>{t("content")}</Label>
            <TiptapEditor
              content={content}
              onChange={handleContentChange}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc("publish")}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={loading}
            >
              {t("saveDraft")}
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      </div>

      <LoadingOverlay isOpen={loading} />
    </FormProvider>
  );
}

