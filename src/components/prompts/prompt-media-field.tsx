"use client";

import { useState, useRef, useEffect } from "react";
import type { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Upload, X, Sparkles } from "lucide-react";
import { MediaGenerator } from "./media-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { validateSkillFrontmatter } from "@/lib/skill-files";

interface MediaFieldProps {
  form: ReturnType<typeof useForm<PromptFormValues>>;
  t: (key: string) => string;
  promptType?: string;
  promptContent?: string;
}

export function MediaField({ form, t, promptType, promptContent }: MediaFieldProps) {
  const [storageMode, setStorageMode] = useState<string>("url");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [hasGenerators, setHasGenerators] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaUrl = form.watch("mediaUrl");
  const isVideoType = promptType === "VIDEO";
  const isAudioType = promptType === "AUDIO";
  const mediaType = isVideoType ? "VIDEO" : isAudioType ? "AUDIO" : "IMAGE";

  useEffect(() => {
    fetch("/api/config/storage")
      .then((res) => res.json())
      .then((data) => setStorageMode(data.mode))
      .catch(() => setStorageMode("url"));
  }, []);

  // Check if media generation is available
  useEffect(() => {
    fetch("/api/media-generate")
      .then((res) => res.json())
      .then((data) => {
        const models = isVideoType ? data.videoModels : isAudioType ? data.audioModels : data.imageModels;
        setHasGenerators(models && models.length > 0);
      })
      .catch(() => setHasGenerators(false));
  }, [isVideoType, isAudioType]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (4MB for both - Vercel serverless limit)
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(t(isVideoType ? "videoTooLarge" : "fileTooLarge"));
      return;
    }

    // Validate file type
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedVideoTypes = ["video/mp4"];
    const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
    const allowedTypes = isVideoType ? allowedVideoTypes : isAudioType ? allowedAudioTypes : allowedImageTypes;
    if (!allowedTypes.includes(file.type)) {
      setUploadError(t(isVideoType ? "invalidVideoType" : isAudioType ? "invalidAudioType" : "invalidFileType"));
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      form.setValue("mediaUrl", result.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearMedia = () => {
    form.setValue("mediaUrl", "");
    setUploadError(null);
  };

  const handleMediaGenerated = (url: string) => {
    form.setValue("mediaUrl", url);
    setShowUpload(false);
  };

  const handleUploadClick = () => {
    if (storageMode === "url") {
      setShowUpload(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  // URL mode with generator option
  if (storageMode === "url") {
    return (
      <FormField
        control={form.control}
        name="mediaUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("mediaUrl")}</FormLabel>
            <div className="space-y-3">
              {mediaUrl ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    {isVideoType ? (
                      <video src={mediaUrl} controls className="max-h-40 rounded-md border" />
                    ) : isAudioType ? (
                      <audio src={mediaUrl} controls className="w-full max-w-md" />
                    ) : (
                      <img src={mediaUrl} alt="Preview" className="max-h-40 rounded-md border" />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={clearMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {hasGenerators && !showUpload ? (
                    <div className="rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-5 w-5" />
                        <span className="font-medium">{t("aiGenerationAvailable")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t(isVideoType ? "generateVideoDescription" : isAudioType ? "generateAudioDescription" : "generateImageDescription")}
                      </p>
                      <MediaGenerator
                        prompt={promptContent || ""}
                        mediaType={mediaType as "IMAGE" | "VIDEO" | "AUDIO"}
                        onMediaGenerated={handleMediaGenerated}
                        onUploadClick={handleUploadClick}
                      />
                    </div>
                  ) : (
                    <MediaGenerator
                      prompt={promptContent || ""}
                      mediaType={mediaType as "IMAGE" | "VIDEO" | "AUDIO"}
                      onMediaGenerated={handleMediaGenerated}
                      onUploadClick={handleUploadClick}
                    />
                  )}
                  {showUpload && (
                    <FormControl>
                      <Input placeholder={t("mediaUrlPlaceholder")} {...field} />
                    </FormControl>
                  )}
                </div>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Upload mode: show file upload with generator option
  return (
    <FormField
      control={form.control}
      name="mediaUrl"
      render={() => (
        <FormItem>
          <FormLabel>{t(isVideoType ? "mediaVideo" : isAudioType ? "mediaAudio" : "mediaImage")}</FormLabel>
          <FormControl>
            <div className="space-y-3">
              {mediaUrl ? (
                <div className="relative inline-block">
                  {isVideoType ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="max-h-40 rounded-md border"
                    />
                  ) : isAudioType ? (
                    <audio
                      src={mediaUrl}
                      controls
                      className="w-full max-w-md"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Preview"
                      className="max-h-40 rounded-md border"
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={clearMedia}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {hasGenerators && !showUpload ? (
                    <div className="rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-5 w-5" />
                        <span className="font-medium">{t("aiGenerationAvailable")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t(isVideoType ? "generateVideoDescription" : isAudioType ? "generateAudioDescription" : "generateImageDescription")}
                      </p>
                      <MediaGenerator
                        prompt={promptContent || ""}
                        mediaType={mediaType as "IMAGE" | "VIDEO" | "AUDIO"}
                        onMediaGenerated={handleMediaGenerated}
                        onUploadClick={handleUploadClick}
                      />
                    </div>
                  ) : (
                    <MediaGenerator
                      prompt={promptContent || ""}
                      mediaType={mediaType as "IMAGE" | "VIDEO" | "AUDIO"}
                      onMediaGenerated={handleMediaGenerated}
                      onUploadClick={handleUploadClick}
                    />
                  )}
                  {showUpload && (
                    <div
                      className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground">
                        {isUploading ? t("uploading") : t(isVideoType ? "clickToUploadVideo" : isAudioType ? "clickToUploadAudio" : "clickToUpload")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(isVideoType ? "maxVideoSize" : isAudioType ? "maxAudioSize" : "maxFileSize")}
                      </p>
                    </div>
                  )}
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={isVideoType ? "video/mp4" : isAudioType ? "audio/mpeg,audio/mp3,audio/wav,audio/ogg" : "image/jpeg,image/png,image/gif,image/webp"}
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const createPromptSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1, t("titleRequired")).max(200),
  description: z.string().max(500).optional(),
  content: z.string().min(1, t("contentRequired")),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "SKILL", "TASTE"]), // Output type, SKILL, or TASTE
  structuredFormat: z.enum(["JSON", "YAML"]).optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()),
  isPrivate: z.boolean(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  requiresMediaUpload: z.boolean(),
  requiredMediaType: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]).optional(),
  requiredMediaCount: z.coerce.number().int().min(1).max(10).optional(),
  bestWithModels: z.array(z.string()).max(3).optional(),
  bestWithMCP: z.array(z.object({
    command: z.string(),
    tools: z.array(z.string()).optional(),
  })).optional(),
  workflowLink: z.string().url().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.type === "SKILL") {
    const frontmatterError = validateSkillFrontmatter(data.content);
    if (frontmatterError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t(`validation.${frontmatterError}`),
        path: ["content"],
      });
    }
  }
});

export type PromptFormValues = z.infer<ReturnType<typeof createPromptSchema>>;
