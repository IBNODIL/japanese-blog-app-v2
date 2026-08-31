"use client";

import { useState, useEffect } from "react";
import { useLoadingAction } from "@/hooks/use-loading-action";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface FooterLink {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  order: number;
}

interface NewLinkData {
  label: string;
  url: string;
  icon: string;
  iconFile: File | null;
  iconPreview: string | null;
  order: number;
}

export default function FooterPage() {
  const t = useTranslations("dashboard");
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLink, setNewLink] = useState<NewLinkData>({
    label: "",
    url: "",
    icon: "",
    iconFile: null,
    iconPreview: null,
    order: 0,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast.error("Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Icon file must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewLink({
        ...newLink,
        iconFile: file,
        iconPreview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const uploadIconFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/image-upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload icon");
    }

    const data = await res.json();
    return data.url;
  };

  const handleAddAction = async () => {
    if (!newLink.label || !newLink.url) {
      throw new Error("Label and URL are required");
    }

    let iconUrl = "";
    if (newLink.iconFile) {
      iconUrl = await uploadIconFile(newLink.iconFile);
    }

    const res = await fetch("/api/admin/footer-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLink.label,
        url: newLink.url,
        icon: iconUrl || null,
        order: newLink.order,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add link");
    }

    const added = await res.json();
    setLinks([...links, added]);
    setNewLink({
      label: "",
      url: "",
      icon: "",
      iconFile: null,
      iconPreview: null,
      order: 0,
    });
    toast.success("Footer link added successfully");
  };

  const [handleAdd] = useLoadingAction(handleAddAction);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/footer-links/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete link");
      }

      setLinks(links.filter((l) => l.id !== id));
      toast.success("Footer link deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete link");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/footer-links");
      if (!res.ok) throw new Error("Failed to fetch links");

      const data: FooterLink[] = await res.json();
      setLinks(data);
    } catch (error) {
      console.error("Error fetching links:", error);
      toast.error("Failed to fetch footer links");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = async () => {
    setIsSaving(true);
    try {
      await handleAdd();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("manageFooterFollowUs")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("socialMediaLinks")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("addNewFollowLink")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="label">{t("linkLabel")}</Label>
              <Input
                id="label"
                placeholder="e.g., Telegram, Instagram"
                value={newLink.label}
                onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">{t("linkUrl")}</Label>
              <Input
                id="url"
                placeholder="e.g., https://t.me/uzjta"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">{t("displayOrder")}</Label>
            <Input
              id="order"
              type="number"
              min="0"
              value={newLink.order}
              onChange={(e) => setNewLink({ ...newLink, order: parseInt(e.target.value) || 0 })}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">{t("lowerNumbersAppear")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("iconOptional")}</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {t("uploadSmallSquare")}
            </p>
            {newLink.iconPreview ? (
              <div className="flex items-center gap-4 p-4 border rounded bg-muted">
                <div className="relative w-16 h-16">
                  <Image
                    src={newLink.iconPreview}
                    alt="Icon preview"
                    className="w-16 h-16 object-contain"
                    width={64}
                    height={64}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNewLink({
                      ...newLink,
                      iconFile: null,
                      iconPreview: null,
                    })
                  }
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("removeIcon")}
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("clickUploadIcon")}</span>
                  <span className="text-xs text-muted-foreground">{t("orDragDrop")}</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleIconFileChange}
                  disabled={isSaving}
                />
              </label>
            )}
          </div>

          <Button onClick={handleAddClick} disabled={isSaving} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {isSaving ? t("adding") : t("addFollowLink")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("currentFollowLinksCount", { count: links.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noFollowLinks")}
            </div>
          ) : (
            <div className="space-y-3">
              {links
                .sort((a, b) => a.order - b.order)
                .map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-4 border rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {link.icon && (
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded border">
                          <Image
                            src={link.icon}
                            alt={link.label}
                            className="w-full h-full object-contain rounded"
                            width={40}
                            height={40}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{link.label}</p>
                        <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Order: <span className="font-semibold">{link.order}</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(link.id)}
                      disabled={deletingId === link.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === link.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}