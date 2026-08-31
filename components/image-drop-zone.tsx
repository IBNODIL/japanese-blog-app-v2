"use client";

import { useCallback, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageDropZoneProps {
  value: string | null;
  onChange: (url: string) => void;
  onClear: () => void;
  label?: string;
}

export function ImageDropZone({ value, onChange, onClear, label }: ImageDropZoneProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

      // Validate file size (10MB)
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

        // Upload file
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
        onChange(data.url);
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to upload image. Please try again.");
        setPreview(null);
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onChange]
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

  const handleClear = () => {
    setPreview(null);
    setFileName(null);
    onClear();
  };

  return (
    <div className="w-full space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}

      {preview && (
        <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-border bg-muted">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-contain"
          />
          {!isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-1 top-1 rounded-full bg-white p-1 shadow-md hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
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
            ? "border-primary bg-primary/5"
            : isLoading
            ? "border-border bg-muted/50"
            : "border-border hover:border-primary hover:bg-primary/5"
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
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                Uploading {fileName}...
              </p>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Drag and drop your image here
              </p>
              <p className="text-xs text-muted-foreground">or click to select</p>
            </>
          )}
        </div>
      </label>
    </div>
  );
}
