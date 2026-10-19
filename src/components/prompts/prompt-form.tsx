"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip, Sparkles, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { VariableToolbar } from "./variable-toolbar";
import { VariableWarning } from "./variable-warning";
import { VariableHint } from "./variable-hint";
import { StructuredFormatWarning } from "./structured-format-warning";
import { PromptBuilder, type PromptBuilderHandle } from "./prompt-builder";
import { SkillEditor } from "./skill-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  generateSkillContentWithFrontmatter,
  updateSkillFrontmatter,
} from "@/lib/skill-files";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeEditor, type CodeEditorHandle } from "@/components/ui/code-editor";
import { toast } from "sonner";
import { prettifyJson } from "@/lib/format";
import { analyticsPrompt } from "@/lib/analytics";
import { getPromptUrl } from "@/lib/urls";

import {
  createPromptSchema,
  type PromptFormValues,
} from "./prompt-media-field";
import {
  PromptFormAdvancedMetaSection,
  PromptFormOutputSection,
  type Contributor,
} from "./prompt-form-sections";

interface PromptFormProps {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
  initialData?: Partial<PromptFormValues>;
  initialContributors?: Contributor[];
  promptId?: string;
  mode?: "create" | "edit";
  aiGenerationEnabled?: boolean;
  aiModelName?: string;
  initialPromptRequest?: string;
}

// Read builder data from sessionStorage before form initialization
function getBuilderData(): { content?: string; type?: string; format?: string } | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("from") !== "builder") return null;
  
  const storedData = sessionStorage.getItem("promptBuilderData");
  if (!storedData) return null;
  
  sessionStorage.removeItem("promptBuilderData");
  try {
    return JSON.parse(storedData);
  } catch {
    return null;
  }
}

export function PromptForm({ categories, tags, initialData, initialContributors = [], promptId, mode = "create", aiGenerationEnabled = false, aiModelName, initialPromptRequest }: PromptFormProps) {
  const router = useRouter();
  const t = useTranslations("prompts");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>(initialContributors);
  const [usedAiButtons, setUsedAiButtons] = useState<Set<string>>(new Set());
  const builderRef = useRef<PromptBuilderHandle>(null);
  const [availableGenerators, setAvailableGenerators] = useState<string[]>([]);

  // Get builder data on first render
  const [builderData] = useState(() => getBuilderData());

  const promptSchema = createPromptSchema(t);
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema) as never,
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      content: builderData?.content || (initialData?.content && initialData?.structuredFormat === "JSON" 
        ? prettifyJson(initialData.content) 
        : (initialData?.content || "")),
      type: builderData?.format ? "TEXT" : (builderData?.type as "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" || initialData?.type || "TEXT"),
      structuredFormat: (builderData?.format as "JSON" | "YAML") || initialData?.structuredFormat || undefined,
      categoryId: initialData?.categoryId || "",
      tagIds: initialData?.tagIds || [],
      isPrivate: initialData?.isPrivate || false,
      mediaUrl: initialData?.mediaUrl || "",
      requiresMediaUpload: initialData?.requiresMediaUpload || false,
      requiredMediaType: initialData?.requiredMediaType || "IMAGE",
      requiredMediaCount: initialData?.requiredMediaCount || 1,
      bestWithModels: initialData?.bestWithModels || [],
      bestWithMCP: initialData?.bestWithMCP || [],
      workflowLink: initialData?.workflowLink || "",
    },
  });

  const promptType = form.watch("type");
  const structuredFormat = form.watch("structuredFormat");
  const isStructuredInput = !!structuredFormat;
  const requiresMediaUpload = form.watch("requiresMediaUpload");
  const promptContent = form.watch("content");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeEditorRef = useRef<CodeEditorHandle>(null);

  // Warn user before leaving page with unsaved changes
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Watch title and description to update skill frontmatter
  const watchedTitle = form.watch("title");
  const watchedDescription = form.watch("description");
  const prevTitleRef = useRef(watchedTitle);
  const prevDescriptionRef = useRef(watchedDescription);
  
  useEffect(() => {
    // Only update if type is SKILL and title or description actually changed
    if (promptType !== "SKILL") return;
    
    const titleChanged = prevTitleRef.current !== watchedTitle;
    const descChanged = prevDescriptionRef.current !== watchedDescription;
    
    if (titleChanged || descChanged) {
      prevTitleRef.current = watchedTitle;
      prevDescriptionRef.current = watchedDescription;
      
      const currentContent = form.getValues("content");
      // Only update if content already has frontmatter (avoid overwriting during initial load)
      if (currentContent && currentContent.startsWith("---")) {
        const updatedContent = updateSkillFrontmatter(currentContent, watchedTitle, watchedDescription || "");
        form.setValue("content", updatedContent);
      }
    }
  }, [watchedTitle, watchedDescription, promptType, form]);

  // Fetch available media generator names
  useEffect(() => {
    fetch("/api/media-generate")
      .then((res) => res.json())
      .then((data) => {
        const providers = new Set<string>();
        if (data.imageModels?.length > 0 || data.videoModels?.length > 0) {
          const allModels = [...(data.imageModels || []), ...(data.videoModels || [])];
          allModels.forEach((model: { providerName: string }) => {
            if (model.providerName) providers.add(model.providerName);
          });
        }
        setAvailableGenerators(Array.from(providers));
      })
      .catch(() => setAvailableGenerators([]));
  }, []);

  // Handler for AI builder state changes
  const handleBuilderStateChange = (newState: {
    title: string;
    description: string;
    content: string;
    type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "SKILL" | "TASTE";
    structuredFormat?: "JSON" | "YAML";
    categoryId?: string;
    tagIds: string[];
    isPrivate: boolean;
    requiresMediaUpload: boolean;
    requiredMediaType?: "IMAGE" | "VIDEO" | "DOCUMENT";
    requiredMediaCount?: number;
  }) => {
    const opts = { shouldDirty: true, shouldTouch: true };
    if (newState.title) form.setValue("title", newState.title, opts);
    if (newState.description) form.setValue("description", newState.description, opts);
    if (newState.content) form.setValue("content", newState.content, opts);
    if (newState.type) form.setValue("type", newState.type, opts);
    if (newState.structuredFormat) form.setValue("structuredFormat", newState.structuredFormat, opts);
    if (newState.categoryId) form.setValue("categoryId", newState.categoryId, opts);
    if (newState.tagIds?.length) form.setValue("tagIds", newState.tagIds, opts);
    form.setValue("isPrivate", newState.isPrivate, opts);
    form.setValue("requiresMediaUpload", newState.requiresMediaUpload, opts);
    if (newState.requiredMediaType) form.setValue("requiredMediaType", newState.requiredMediaType, opts);
    if (newState.requiredMediaCount) form.setValue("requiredMediaCount", newState.requiredMediaCount, opts);
  };

  // Current state for AI builder
  const currentBuilderState = {
    title: form.watch("title"),
    description: form.watch("description") || "",
    content: form.watch("content"),
    type: form.watch("type"),
    structuredFormat: form.watch("structuredFormat"),
    categoryId: form.watch("categoryId"),
    tagIds: form.watch("tagIds"),
    isPrivate: form.watch("isPrivate"),
    requiresMediaUpload: form.watch("requiresMediaUpload"),
    requiredMediaType: form.watch("requiredMediaType"),
    requiredMediaCount: form.watch("requiredMediaCount"),
  };

  const getSelectedText = () => {
    // For text prompts using textarea
    const textarea = textareaRef.current;
    if (textarea) {
      return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    }
    return "";
  };

  const insertVariable = (variable: string) => {
    // For structured prompts using Monaco editor
    if (isStructuredInput && codeEditorRef.current) {
      codeEditorRef.current.insertAtCursor(variable);
      return;
    }
    
    // For text prompts using textarea
    const textarea = textareaRef.current;
    const currentContent = form.getValues("content");
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = currentContent.slice(0, start) + variable + currentContent.slice(end);
      form.setValue("content", newContent);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      // Fallback: append to end
      form.setValue("content", currentContent + variable);
    }
  };

  async function onSubmit(data: PromptFormValues) {
    setIsLoading(true);

    try {
      const isEdit = mode === "edit" && promptId;
      const url = isEdit ? `/api/prompts/${promptId}` : "/api/prompts";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          structuredFormat: data.structuredFormat || null, // Explicitly send null to clear
          contributorIds: contributors.map((c) => c.id),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error types
        if (result.error === "rate_limit") {
          toast.error(t("rateLimitError"));
          return;
        }
        if (result.error === "daily_limit") {
          toast.error(t("dailyLimitError"));
          return;
        }
        if (result.error === "duplicate_prompt") {
          toast.error(t("duplicatePromptError"));
          return;
        }
        if (result.error === "content_exists") {
          toast.error(t("contentExistsError", { 
            title: result.existingPromptTitle,
            author: result.existingPromptAuthor 
          }));
          return;
        }
        throw new Error("Failed to save prompt");
      }
      if (isEdit) {
        analyticsPrompt.edit(promptId!);
      } else {
        analyticsPrompt.create(data.type);
      }
      toast.success(isEdit ? t("promptUpdated") : t("promptCreated"));
      router.push(getPromptUrl(result.id || promptId, result.slug));
      router.refresh();
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }

  const handleAiGenerate = (field: string, label: string) => {
    if (usedAiButtons.has(field) || !builderRef.current) return;
    setUsedAiButtons(prev => new Set(prev).add(field));
    builderRef.current.sendMessage(`Generate ${label}`);
  };

  const AiGenerateButton = ({ field, label }: { field: string; label: string }) => {
    if (!aiGenerationEnabled) return null;
    const isUsed = usedAiButtons.has(field);
    return (
      <button
        type="button"
        onClick={() => handleAiGenerate(field, label)}
        disabled={isUsed}
        className={`inline-flex items-center justify-center h-4 w-4 rounded transition-colors ${
          isUsed 
            ? "text-muted-foreground/30 cursor-not-allowed" 
            : "text-primary/60 hover:text-primary hover:bg-primary/10"
        }`}
        title={`Generate ${label}`}
      >
        <Sparkles className="h-3 w-3" />
      </button>
    );
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Header: Page title + Private Switch */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">{mode === "edit" ? t("edit") : t("create")}</h1>
            <div className="flex items-center gap-3">
              {aiGenerationEnabled && (
                <PromptBuilder
                  ref={builderRef}
                  availableTags={tags}
                  availableCategories={categories}
                  currentState={currentBuilderState}
                  onStateChange={handleBuilderStateChange}
                  modelName={aiModelName}
                  initialPromptRequest={initialPromptRequest}
                />
              )}
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 text-sm font-normal">{t("promptPrivate")}</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>

        {/* ===== PROMPT WRITING GUIDE LINK ===== */}
        <Link
          href="/how_to_write_effective_prompts"
          target="_blank"
          className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-4 w-4 text-primary" />
          <span>{t("learnHowToWritePrompts")}</span>
          <ExternalLink className="h-3 w-3 ml-auto" />
        </Link>

        {/* ===== METADATA SECTION ===== */}
        <div className="space-y-4 pb-6 border-b">
          {/* Row 1: Title + Category */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="flex items-center gap-1.5">
                    {t("promptTitle")}
                    <AiGenerateButton field="title" label="Title" />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="w-full sm:w-64">
                  <FormLabel className="flex items-center gap-1.5">
                    {t("promptCategory")}
                    <AiGenerateButton field="category" label="Category" />
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)} 
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("selectCategory")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t("noCategory")}</SelectItem>
                      {categories
                        .filter((c) => c.id && !c.parentId)
                        .map((parent) => (
                          <div key={parent.id}>
                            <SelectItem value={parent.id} className="font-medium">
                              {parent.name}
                            </SelectItem>
                            {categories
                              .filter((c) => c.parentId === parent.id)
                              .map((child) => (
                                <SelectItem key={child.id} value={child.id} className="pl-6 text-muted-foreground">
                                  ↳ {child.name}
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Row 2: Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  {t("promptDescription")}
                  <AiGenerateButton field="description" label="Description" />
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("descriptionPlaceholder")}
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <PromptFormAdvancedMetaSection
            form={form}
            tags={tags}
            contributors={contributors}
            setContributors={setContributors}
            t={t}
            renderAiGenerateButton={(field, label) => (
              <AiGenerateButton field={field} label={label} />
            )}
          />
        </div>

        {/* ===== INPUT SECTION ===== */}
        <div className="space-y-4 py-6">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{t("inputType")}</h2>
          </div>
          
          {/* Input Type & Format selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Select 
                value={promptType === "SKILL" ? "SKILL" : promptType === "TASTE" ? "TASTE" : (isStructuredInput ? "STRUCTURED" : "TEXT")} 
                onValueChange={(v) => {
                  if (v === "STRUCTURED") {
                    form.setValue("structuredFormat", "JSON");
                    form.setValue("type", "TEXT");
                  } else if (v === "SKILL") {
                    form.setValue("structuredFormat", undefined);
                    form.setValue("type", "SKILL");
                    // Auto-generate frontmatter from title and description
                    const currentContent = form.getValues("content");
                    const title = form.getValues("title");
                    const description = form.getValues("description") || "";
                    // Only generate if content is empty or doesn't look like skill content
                    if (!currentContent || !currentContent.startsWith("---")) {
                      form.setValue("content", generateSkillContentWithFrontmatter(title, description));
                    }
                  } else if (v === "TASTE") {
                    form.setValue("structuredFormat", undefined);
                    form.setValue("type", "TASTE");
                    // Auto-generate placeholder taste content
                    const currentContent = form.getValues("content");
                    if (!currentContent || !currentContent.startsWith("# Taste")) {
                      form.setValue("content", `# Taste\n- Package manager is npm (not pnpm or yarn). Confidence: 0.95\n- Use Next.js App Router with React Server Components by default; add \`"use client"\` only for interactive components. Confidence: 0.95\n`);
                    }
                  } else {
                    form.setValue("structuredFormat", undefined);
                    form.setValue("type", "TEXT");
                  }
                }}
              >
                <SelectTrigger className="h-9 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">{t("inputTypes.text")}</SelectItem>
                  <SelectItem value="STRUCTURED">{t("inputTypes.structured")}</SelectItem>
                  <SelectItem value="SKILL">{t("inputTypes.skill")}</SelectItem>
                  <SelectItem value="TASTE">{t("inputTypes.taste")}</SelectItem>
                </SelectContent>
              </Select>
              {isStructuredInput && (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Select value={structuredFormat || "JSON"} onValueChange={(v) => form.setValue("structuredFormat", v as any)}>
                  <SelectTrigger className="h-9 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="YAML">YAML</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {/* Media upload toggle */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <Switch
                id="media-upload"
                checked={requiresMediaUpload}
                onCheckedChange={(v) => form.setValue("requiresMediaUpload", v)}
              />
              <label htmlFor="media-upload" className="text-sm cursor-pointer">
                {t("requiresMediaUpload")}
              </label>
            </div>
          </div>

          {/* Media type & count - grouped buttons */}
          {requiresMediaUpload && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md border bg-muted/30">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Paperclip className="h-4 w-4" />
                <span>{t("attachedMediaType")}:</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-md border divide-x">
                  {(["IMAGE", "VIDEO", "DOCUMENT"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => form.setValue("requiredMediaType", type)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                        form.watch("requiredMediaType") === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {t(`types.${type.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">×</span>
                  <Input 
                    type="number" 
                    min={1} 
                    max={10}
                    value={form.watch("requiredMediaCount")}
                    onChange={(e) => form.setValue("requiredMediaCount", parseInt(e.target.value) || 1)}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Prompt Content */}
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  {promptType === "SKILL" ? (
                    <SkillEditor
                      value={field.value}
                      onChange={field.onChange}
                    />
                  ) : isStructuredInput ? (
                    <div className="rounded-md border overflow-hidden">
                      <VariableToolbar onInsert={insertVariable} getSelectedText={getSelectedText} />
                      <CodeEditor
                        ref={codeEditorRef}
                        value={field.value}
                        onChange={field.onChange}
                        language={structuredFormat?.toLowerCase() as "json" | "yaml" || "json"}
                        placeholder={
                          structuredFormat === "JSON"
                            ? '{\n  "name": "My Workflow",\n  "steps": []\n}'
                            : 'name: My Workflow\nsteps:\n  - step: first\n    prompt: "..."'
                        }
                        minHeight="250px"
                        className="border-0 rounded-none"
                      />
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <VariableToolbar onInsert={insertVariable} getSelectedText={getSelectedText} />
                      <Textarea
                        ref={(el) => {
                          textareaRef.current = el;
                          if (typeof field.ref === 'function') field.ref(el);
                        }}
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder={t("contentPlaceholder")}
                        className="min-h-[150px] font-mono border-0 rounded-none focus-visible:ring-0"
                      />
                    </div>
                  )}
                </FormControl>
                <VariableHint content={field.value} onContentChange={(newContent) => form.setValue("content", newContent)} />
                {/* Show error with generate frontmatter link for SKILL type */}
                {promptType === "SKILL" && form.formState.errors.content ? (
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <span>{form.formState.errors.content.message}</span>
                    <button
                      type="button"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                      onClick={() => {
                        const title = form.getValues("title");
                        const description = form.getValues("description") || "";
                        const currentContent = form.getValues("content");
                        const updatedContent = updateSkillFrontmatter(currentContent, title, description);
                        form.setValue("content", updatedContent, { shouldValidate: true });
                      }}
                    >
                      <Sparkles className="h-3 w-3" />
                      {t("generateFrontmatter")}
                    </button>
                  </p>
                ) : (
                  <FormMessage />
                )}
              </FormItem>
            )}
          />

          {/* Variable detection warning */}
          <VariableWarning
            content={promptContent}
            onConvert={(converted) => form.setValue("content", converted)}
          />

          {/* Structured format detection warning - hide for SKILL and TASTE types */}
          {promptType !== "SKILL" && promptType !== "TASTE" && (
            <StructuredFormatWarning
              content={promptContent}
              isStructuredInput={isStructuredInput}
              onSwitchToStructured={(format) => {
                form.setValue("structuredFormat", format);
                form.setValue("type", "TEXT");
              }}
            />
          )}
        </div>

        <PromptFormOutputSection
          form={form}
          promptType={promptType}
          promptContent={promptContent}
          availableGenerators={availableGenerators}
          mode={mode}
          t={t}
        />

        <div className="flex justify-end gap-4 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "edit" ? t("update") : t("createButton")} Prompt
          </Button>
        </div>
        </form>
      </Form>
    </>
  );
}
