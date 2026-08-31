"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface HomepageContent {
  id: string;
  language: string;
  title: string;
  subtitle: string;
  description: string | null;
}

interface EditableContentProps {
  content: Record<string, HomepageContent>;
  currentLanguage: string;
  onContentUpdated: () => void;
}

export function EditableHomepageContent({
  content,
  currentLanguage,
  onContentUpdated,
}: EditableContentProps) {
  const t = useTranslations("dashboard");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingField, setEditingField] = useState<"title" | "subtitle" | "description" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLanguage, setEditLanguage] = useState(currentLanguage);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalValue, setOriginalValue] = useState("");

  const currentContent = content[editLanguage];

  const openEditDialog = (field: "title" | "subtitle" | "description", value: string | null) => {
    setEditingField(field);
    setEditValue(value || "");
    setOriginalValue(value || "");
    setAutoTranslate(false);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!currentContent || !editingField) return;

    setIsSaving(true);
    try {
      const payload = {
        language: editLanguage,
        title: editingField === "title" ? editValue : currentContent.title,
        subtitle: editingField === "subtitle" ? editValue : currentContent.subtitle,
        description: editingField === "description" ? editValue : currentContent.description,
        autoTranslate,
        editedField: editingField,
      };

      const res = await fetch("/api/admin/homepage-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save content");
      }

      toast.success(
        autoTranslate
          ? `Saved and auto-translated to all languages`
          : `Saved for ${editLanguage.toUpperCase()} only`
      );

      setIsEditOpen(false);
      onContentUpdated();
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditValue(originalValue);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Title */}
        <div className="group">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t("titleField")}</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground">
                {currentContent?.title}
              </h2>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => openEditDialog("title", currentContent?.title || "")}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Subtitle */}
        <div className="group">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t("subtitleField")}</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                {currentContent?.subtitle}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => openEditDialog("subtitle", currentContent?.subtitle || "")}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="group">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t("descriptionField")}</p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {currentContent?.description || "(No description yet)"}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => openEditDialog("description", currentContent?.description || "")}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex flex-wrap gap-2 pt-4">
          <Badge variant="outline">{t("editing")}:</Badge>
          {["uz", "en", "ja", "ru"].map((lang) => (
            <Badge
              key={lang}
              variant={editLanguage === lang ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setEditLanguage(lang)}
            >
              {lang.toUpperCase()}
            </Badge>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {editingField ? editingField.charAt(0).toUpperCase() + editingField.slice(1) : "Content"} ({editLanguage.toUpperCase()})
            </DialogTitle>
            <DialogDescription>
              Make changes to this content. You can choose to save only this language or auto-translate to all languages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingField === "description" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-value">Content</Label>
                <Textarea
                  id="edit-value"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={5}
                  placeholder="Enter content..."
                  className="font-mono text-sm"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-value">Content</Label>
                <Input
                  id="edit-value"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter content..."
                />
              </div>
            )}

            {/* Original Value */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Original Value:</p>
              <p className="text-sm font-medium text-foreground break-words">{originalValue}</p>
            </div>

            {/* Auto-translate Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <input
                type="checkbox"
                id="auto-translate"
                checked={autoTranslate}
                onChange={(e) => setAutoTranslate(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <div className="flex-1">
                <label htmlFor="auto-translate" className="text-sm font-medium cursor-pointer">
                  Auto-translate to all languages
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {autoTranslate
                    ? "This change will be automatically translated to UZ, EN, JA, and RU"
                    : "This change will only affect the current language"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || editValue === originalValue}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {autoTranslate ? "Save & Translate" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
