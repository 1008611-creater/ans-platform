"use client";

import { useState, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  X,
  ArrowDown,
  Image as ImageIcon,
  Video,
  Volume2,
  Search,
  Sparkles,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { ContributorSearch } from "./contributor-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AI_MODELS, getModelsByProvider } from "@/lib/works-best-with";
import { MediaField, type PromptFormValues } from "./prompt-media-field";

export interface Contributor {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}

export interface PromptTagOption {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface PromptFormAdvancedMetaSectionProps {
  form: UseFormReturn<PromptFormValues>;
  tags: PromptTagOption[];
  contributors: Contributor[];
  setContributors: React.Dispatch<React.SetStateAction<Contributor[]>>;
  t: (key: string) => string;
  renderAiGenerateButton: (field: string, label: string) => React.ReactNode;
}

export function PromptFormAdvancedMetaSection({
  form,
  tags,
  contributors,
  setContributors,
  t,
  renderAiGenerateButton,
}: PromptFormAdvancedMetaSectionProps) {
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [newMcpCommand, setNewMcpCommand] = useState("");
  const [newMcpTools, setNewMcpTools] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedTags = form.watch("tagIds");
  const bestWithMCP = form.watch("bestWithMCP") || [];
  const bestWithModels = form.watch("bestWithModels") || [];
  const modelsByProvider = getModelsByProvider();

  const toggleTag = (tagId: string) => {
    const current = form.getValues("tagIds");
    if (current.includes(tagId)) {
      form.setValue("tagIds", current.filter((id) => id !== tagId));
    } else {
      form.setValue("tagIds", [...current, tagId]);
    }
  };

  return (
    <>
      {/* Tags with Search Autocomplete */}
      <FormField
        control={form.control}
        name="tagIds"
        render={() => {
          const filteredTags = tags.filter(
            (tag) =>
              !selectedTags.includes(tag.id) &&
              tag.name.toLowerCase().includes(tagSearch.toLowerCase())
          );
          const selectedTagObjects = tags.filter((tag) => selectedTags.includes(tag.id));

          return (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                {t("promptTags")}
                {renderAiGenerateButton("tags", "Tags")}
              </FormLabel>
              {/* Selected tags */}
              {selectedTagObjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTagObjects.map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{ backgroundColor: tag.color, color: "white" }}
                      className="pr-1 flex items-center gap-1"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="ml-1 rounded-full hover:bg-white/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {/* Search input */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={tagInputRef}
                    type="text"
                    placeholder={t("searchTags")}
                    value={tagSearch}
                    onChange={(e) => {
                      setTagSearch(e.target.value);
                      setTagDropdownOpen(true);
                    }}
                    onFocus={() => setTagDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setTagDropdownOpen(false), 150)}
                    className="pl-9"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                {/* Dropdown suggestions */}
                {tagDropdownOpen && filteredTags.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          toggleTag(tag.id);
                          setTagSearch("");
                          tagInputRef.current?.focus();
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                {tagDropdownOpen && tagSearch && filteredTags.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md p-3 text-sm text-muted-foreground">
                    {t("noTagsFound")}
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      {/* Contributors */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">{t("promptContributors")}</label>
        <p className="text-xs text-muted-foreground">{t("contributorsDescription")}</p>
        <ContributorSearch
          selectedUsers={contributors}
          onSelect={(user) => setContributors((prev) => [...prev, user])}
          onRemove={(userId) => setContributors((prev) => prev.filter((u) => u.id !== userId))}
        />
      </div>

      {/* Advanced Section */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full p-3 text-sm font-medium text-left hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            {t("advancedOptions")}
            {(bestWithModels.length > 0 || bestWithMCP.length > 0) && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {bestWithModels.length + bestWithMCP.length}
              </Badge>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>
        {showAdvanced && (
          <div className="p-3 space-y-4 border-t">
            {/* Works Best With Models */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">{t("worksBestWithModels")}</label>
              <p className="text-xs text-muted-foreground">{t("worksBestWithModelsDescription")}</p>
              {bestWithModels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {bestWithModels.map((slug) => {
                    const model = AI_MODELS[slug as keyof typeof AI_MODELS];
                    return (
                      <Badge key={slug} variant="secondary" className="pr-1 flex items-center gap-1">
                        {model?.name || slug}
                        <button
                          type="button"
                          onClick={() =>
                            form.setValue(
                              "bestWithModels",
                              bestWithModels.filter((s) => s !== slug)
                            )
                          }
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              {bestWithModels.length < 3 && (
                <Select
                  value=""
                  onValueChange={(slug) => {
                    if (slug && !bestWithModels.includes(slug)) {
                      form.setValue("bestWithModels", [...bestWithModels, slug]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-64 h-8 text-xs">
                    <SelectValue placeholder={t("selectModel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(modelsByProvider).map(([provider, models]) => (
                      <div key={provider}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {provider}
                        </div>
                        {models
                          .filter((m) => !bestWithModels.includes(m.slug))
                          .map((model) => (
                            <SelectItem key={model.slug} value={model.slug}>
                              {model.name}
                            </SelectItem>
                          ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Works Best With MCP */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">{t("worksBestWithMCP")}</label>
              <p className="text-xs text-muted-foreground">{t("worksBestWithMCPDescription")}</p>
              {bestWithMCP.length > 0 && (
                <div className="space-y-1.5">
                  {bestWithMCP.map((mcp, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-xs"
                    >
                      <code className="flex-1 break-all">{mcp.command}</code>
                      {mcp.tools && mcp.tools.length > 0 && (
                        <span className="text-muted-foreground">({mcp.tools.join(", ")})</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          form.setValue(
                            "bestWithMCP",
                            bestWithMCP.filter((_, i) => i !== index)
                          )
                        }
                        className="p-1 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder={t("mcpCommandPlaceholder")}
                  value={newMcpCommand}
                  onChange={(e) => setNewMcpCommand(e.target.value)}
                  className="flex-1 text-xs h-8"
                />
                <Input
                  placeholder={t("mcpToolsPlaceholder")}
                  value={newMcpTools}
                  onChange={(e) => setNewMcpTools(e.target.value)}
                  className="w-28 text-xs h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={!newMcpCommand.trim()}
                  onClick={() => {
                    if (newMcpCommand.trim()) {
                      const tools = newMcpTools.trim()
                        ? newMcpTools
                            .split(",")
                            .map((tool) => tool.trim())
                            .filter(Boolean)
                        : undefined;
                      form.setValue("bestWithMCP", [
                        ...bestWithMCP,
                        { command: newMcpCommand.trim(), tools },
                      ]);
                      setNewMcpCommand("");
                      setNewMcpTools("");
                    }
                  }}
                >
                  {t("add")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface PromptFormOutputSectionProps {
  form: UseFormReturn<PromptFormValues>;
  promptType: PromptFormValues["type"];
  promptContent: string;
  availableGenerators: string[];
  mode: "create" | "edit";
  t: (key: string) => string;
}

export function PromptFormOutputSection({
  form,
  promptType,
  promptContent,
  availableGenerators,
  mode,
  t,
}: PromptFormOutputSectionProps) {
  return (
    <>
      {/* ===== LLM PROCESSING ARROW ===== */}
      <div className="flex flex-col items-center py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-px w-16 bg-border" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
            <ArrowDown className="h-3.5 w-3.5" />
            <span>{t("afterAiProcessing")}</span>
          </div>
          <div className="h-px w-16 bg-border" />
        </div>
      </div>

      {/* ===== OUTPUT SECTION ===== */}
      {promptType === "SKILL" || promptType === "TASTE" ? (
        /* SKILL/TASTE type shows a code output preview - code generated BY the skill/taste */
        <div className="space-y-4 py-6 border-t">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{t("outputType")}</h2>
            <p className="text-sm text-muted-foreground">{t("outputTypeSkillNote")}</p>
          </div>

          {/* Code output preview - what the agent generates */}
          <div className="rounded-lg border bg-[#1e1e1e] overflow-hidden">
            {/* Editor title bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-xs text-[#808080] ml-2 font-mono">generated-code.ts</span>
            </div>
            {/* Code output content */}
            <div
              className="p-4 text-xs space-y-1"
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              }}
            >
              <div>
                <span className="text-[#6a9955]">
                  {"// Code generated by skill, and your taste..."}
                </span>
              </div>
              <div>
                <span className="text-[#c586c0]">export</span>{" "}
                <span className="text-[#569cd6]">function</span>{" "}
                <span className="text-[#dcdcaa]">handler</span>
                <span className="text-[#d4d4d4]">()</span>{" "}
                <span className="text-[#d4d4d4]">{"{"}</span>
              </div>
              <div>
                <span className="text-[#d4d4d4]">  </span>
                <span className="text-[#c586c0]">return</span>{" "}
                <span className="text-[#ce9178]">&quot;...&quot;</span>
                <span className="text-[#d4d4d4]">;</span>
              </div>
              <div>
                <span className="text-[#d4d4d4]">{"}"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-6 border-t">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t("outputType")}</h2>
              {availableGenerators.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" />
                      {t("generateWith")}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => form.setValue("type", "IMAGE")}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {t("generateImage")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => form.setValue("type", "VIDEO")}>
                      <Video className="h-4 w-4 mr-2" />
                      {t("generateVideo")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => form.setValue("type", "AUDIO")}>
                      <Volume2 className="h-4 w-4 mr-2" />
                      {t("generateAudio")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t("outputTypeDescription")}</p>
          </div>

          {/* Output Type selector as grouped buttons */}
          <div className="grid grid-cols-2 sm:inline-flex rounded-md border sm:divide-x">
            {(["TEXT", "IMAGE", "VIDEO", "AUDIO"] as const).map((type, index) => (
              <button
                key={type}
                type="button"
                onClick={() => form.setValue("type", type)}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  index === 0 ? "rounded-tl-md sm:rounded-l-md sm:rounded-tr-none" : ""
                } ${
                  index === 1 ? "rounded-tr-md sm:rounded-none border-l sm:border-l-0" : ""
                } ${
                  index === 2 ? "rounded-bl-md sm:rounded-none border-t sm:border-t-0" : ""
                } ${
                  index === 3
                    ? "rounded-br-md sm:rounded-r-md sm:rounded-bl-none border-t border-l sm:border-t-0 sm:border-l-0"
                    : ""
                } ${
                  promptType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {type === "TEXT" && <span className="text-xs">Aa</span>}
                {type === "IMAGE" && <ImageIcon className="h-4 w-4" />}
                {type === "VIDEO" && <Video className="h-4 w-4" />}
                {type === "AUDIO" && <Volume2 className="h-4 w-4" />}
                {t(`outputTypes.${type.toLowerCase()}`)}
              </button>
            ))}
          </div>

          {/* Output Preview based on type */}
          <div className="rounded-lg border bg-muted/20 p-4">
            {promptType === "TEXT" && (
              <div className="text-muted-foreground/50 italic text-sm">
                {t("outputPreview.text")}
              </div>
            )}
            {promptType === "IMAGE" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4" />
                  <span>{t("outputPreview.imageUpload")}</span>
                </div>
                <MediaField form={form} t={t} promptContent={promptContent} />
              </div>
            )}
            {promptType === "VIDEO" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Video className="h-4 w-4" />
                  <span>{t("outputPreview.videoUpload")}</span>
                </div>
                <MediaField form={form} t={t} promptType={promptType} promptContent={promptContent} />
              </div>
            )}
            {promptType === "AUDIO" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Volume2 className="h-4 w-4" />
                  <span>{t("outputPreview.audioUpload")}</span>
                </div>
                <MediaField form={form} t={t} promptType={promptType} promptContent={promptContent} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== WORKFLOW LINK SECTION ===== */}
      <div className="space-y-3 py-6 border-t">
        <FormField
          control={form.control}
          name="workflowLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("workflowLink")}</FormLabel>
              <FormDescription className="text-xs">
                {mode === "create" ? t("workflowLinkCreateNote") : t("workflowLinkDescription")}
              </FormDescription>
              <FormControl>
                <Input
                  placeholder={t("workflowLinkPlaceholder")}
                  {...field}
                  disabled={mode === "create"}
                  className={mode === "create" ? "opacity-50" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
