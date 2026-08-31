"use client";

import { useCallback, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  name: string;
  label?: string;
  className?: string;
}

export function ImageUpload({ name, label, className }: ImageUploadProps) {
  const t = useTranslations("editor");
  const { control, formState: { errors }, setValue } = useFormContext();
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      // Validate file type
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
        alert("Only image files are allowed (JPEG, PNG, GIF, WebP)");
        return;
      }

      setIsLoading(true);
      setFileName(file.name);

      try {
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file using custom image upload endpoint
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/image-upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        setValue(name, data.url);
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to upload image. Please try again.");
        setPreview(null);
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [name, setValue]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        handleFileChange(file);
      } else {
        alert("Only image files are allowed");
      }
    }
  }, [handleFileChange]);

  return (
    <Controller
      control={control}
      name={name}
      render={() => (
        <div className={cn("w-full", className)}>
          {label && <label className="text-sm font-medium">{label}</label>}

          <div className="mt-2">
            {preview && (
              <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                {!isLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setFileName(null);
                      setValue(name, "");
                    }}
                    className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-md hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <label
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : isLoading
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
              )}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                  e.target.value = "";
                }}
                className="hidden"
                disabled={isLoading}
              />

              <div className="flex flex-col items-center gap-2 text-center">
                {isLoading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm font-medium text-gray-600">
                      {t("imageUploading", { filename: fileName || "file" })}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">
                      {t("imageUpload")}
                    </p>
                    <p className="text-xs text-gray-500">{t("imageTypes")}</p>
                  </>
                )}
              </div>
            </label>

            {errors[name] && (
              <p className="mt-2 text-sm text-red-500">
                {(errors[name]?.message as string) || "Invalid image"}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
}
