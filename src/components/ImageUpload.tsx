"use client";

import React, { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadCloud, X, Loader2, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  bucket: "avatars" | "project-media";
  onUpload: (url: string) => void;
  currentUrl?: string;
  maxSizeMb?: number;
  label?: string;
  aspectRatio?: "square" | "video";
}

export function ImageUpload({
  bucket,
  onUpload,
  currentUrl,
  maxSizeMb = 5,
  label = "Upload Image",
  aspectRatio = "video",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(currentUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate size
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMb}MB. Please select a smaller image.`);
      return;
    }

    // Validate MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Only PNG, JPEG, WEBP, or GIF images are accepted.");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const publicUrl = publicUrlData.publicUrl;
      setPreview(publicUrl);
      onUpload(publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreview("");
    onUpload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {preview ? (
        <div
          className={`relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 ${
            aspectRatio === "square" ? "w-28 h-28" : "w-full h-44"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[11px] font-medium hover:bg-black transition"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-50/50 dark:bg-neutral-900/50 transition group ${
            aspectRatio === "square" ? "w-28 h-28" : "w-full h-36"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Uploading to cloud...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 flex items-center justify-center text-neutral-500 group-hover:text-indigo-600 transition">
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Click to upload image
              </p>
              <p className="text-[10px] text-neutral-400">
                PNG, JPG, WEBP up to {maxSizeMb}MB
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

