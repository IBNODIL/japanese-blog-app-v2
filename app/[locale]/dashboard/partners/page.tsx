"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageDropZone } from "@/components/image-drop-zone";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  image: string;
  text: string | null;
  link: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface PartnerFormData {
  name: string;
  image: string;
  text: string;
  link: string;
  order: number;
}

export default function PartnersPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PartnerFormData>({
    name: "",
    image: "",
    text: "",
    link: "",
    order: 0,
  });

  // Check admin access
  useEffect(() => {
    if (!isPending && (!session?.user || !(["ADMIN", "SUPER_ADMIN"].includes((session.user as Record<string, unknown>).role as string)))) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      } else {
        throw new Error(t("errorFetchPartners"));
      }
    } catch (error) {
      console.error("Failed to fetch partners:", error);
      toast.error(t("errorFetchPartners"));
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (partner?: Partner) => {
    if (partner) {
      setEditingId(partner.id);
      setFormData({
        name: partner.name,
        image: partner.image,
        text: partner.text || "",
        link: partner.link || "",
        order: partner.order,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        image: "",
        text: "",
        link: "",
        order: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "order" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/partners/${editingId}` : "/api/partners";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingId ? t("successPartnerUpdated") : t("successPartnerCreated"));
        setIsDialogOpen(false);
        fetchPartners();
      } else {
        const error = await res.json();
        toast.error(error.error || t("errorSavePartner"));
      }
    } catch (error) {
      console.error("Error saving partner:", error);
      toast.error(t("errorSavePartner"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("confirmDeletePartner"))) {
      return;
    }

    try {
      const res = await fetch(`/api/partners/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t("successPartnerDeleted"));
        fetchPartners();
      } else {
        toast.error(t("errorDeletePartner"));
      }
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error(t("errorDeletePartner"));
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session?.user || !(["SUPER_ADMIN"].includes((session.user as Record<string, unknown>).role as string))) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("partnersManagement")}</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addPartner")}
        </Button>
      </div>

      <div className="grid gap-4">
        {partners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("noPartnersYet")}
            </CardContent>
          </Card>
        ) : (
          partners.map((partner) => (
            <Card key={partner.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={partner.image}
                      alt={partner.name}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{partner.name}</h3>
                    {partner.text && (
                      <p className="text-sm text-muted-foreground">
                        {partner.text}
                      </p>
                    )}
                    {partner.link && (
                      <a
                        href={partner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {partner.link}
                      </a>
                    )}
                    <Badge variant="outline" className="mt-2">
                      {t("orderLabel")}: {partner.order}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(partner)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(partner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("editPartner") : t("createPartner")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("partnerName")} *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t("enterPartnerName")}
                required
              />
            </div>

            <div className="space-y-2">
              <ImageDropZone
                value={formData.image}
                onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
                onClear={() => setFormData((prev) => ({ ...prev, image: "" }))}
                label={`${t("partnerImage")} *`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">{t("partnerDescription")}</Label>
              <Textarea
                id="text"
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                placeholder={t("enterPartnerDescription")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">{t("partnerLink")}</Label>
              <Input
                id="link"
                name="link"
                value={formData.link}
                onChange={handleInputChange}
                placeholder={t("enterWebsiteUrl")}
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">{t("displayOrder")}</Label>
              <Input
                id="order"
                name="order"
                type="number"
                value={formData.order}
                onChange={handleInputChange}
                placeholder={t("enterDisplayOrder")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t("cancelPartner")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? t("updatePartner") : t("createPartner")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
