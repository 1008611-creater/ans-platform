"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterContext } from "./filter-context";
import { useInFilterDrawer } from "./responsive-filters";

interface SkillFiltersProps {
  categories: Array<{ id: string; name: string; slug: string; parentId: string | null }>;
  tags: Array<{ id: string; name: string; slug: string; color: string }>;
  currentFilters: { q?: string; category?: string; tag?: string; sort?: string };
}

export function SkillFilters({ categories, tags, currentFilters }: SkillFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { setFilterPending } = useFilterContext();
  // 渲染在移动端抽屉内时去掉卡片边框，避免出现重复分隔线
  const inDrawer = useInFilterDrawer();
  const [tagSearch, setTagSearch] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const selectedTags = currentFilters.tag?.split(",").filter(Boolean) ?? [];
  const filteredTags = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();
    return query ? tags.filter((tag) => tag.name.toLowerCase().includes(query)) : tags;
  }, [tags, tagSearch]);

  const updateFilter = (key: string, value: string | null) => {
    setFilterPending(true);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/skills?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilterPending(true);
    router.push("/skills");
  };

  const hasFilters = currentFilters.q || currentFilters.category || currentFilters.tag || currentFilters.sort;

  return (
    <div className={`space-y-4 p-0 pt-4 border-t lg:pt-4 lg:p-4 lg:border lg:rounded-lg text-sm${inDrawer ? " border-t-0 p-0 pt-0" : ""}`}>
      <div className="flex items-center justify-between h-6">
        <span className="font-medium text-xs uppercase text-muted-foreground">{t("search.filters")}</span>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 text-xs px-2 ${hasFilters ? "visible" : "invisible"}`}
          onClick={clearFilters}
        >
          <X className="h-3 w-3 mr-1" />{t("search.clear")}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t("search.search")}</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("search.placeholder")}
            className="h-8 text-sm pl-8"
            defaultValue={currentFilters.q}
            onChange={(event) => {
              const value = event.target.value;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => updateFilter("q", value || null), 300);
            }}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("prompts.promptCategory")}</Label>
          <Select
            value={currentFilters.category || "all"}
            onValueChange={(value) => updateFilter("category", value === "all" ? null : value)}
          >
            <SelectTrigger className="h-8 text-sm w-full"><SelectValue placeholder={t("common.all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {categories.filter((category) => !category.parentId).map((parent) => (
                <div key={parent.id}>
                  <SelectItem value={parent.id}>{parent.name}</SelectItem>
                  {categories.filter((category) => category.parentId === parent.id).map((child) => (
                    <SelectItem key={child.id} value={child.id} className="pl-6 text-muted-foreground">
                      ↳ {child.name}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">{t("search.sortBy")}</Label>
        <Select
          value={currentFilters.sort || "newest"}
          onValueChange={(value) => updateFilter("sort", value === "newest" ? null : value)}
        >
          <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("search.newest")}</SelectItem>
            <SelectItem value="oldest">{t("search.oldest")}</SelectItem>
            <SelectItem value="upvotes">{t("search.mostUpvoted")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tags.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("prompts.promptTags")}</Label>
          <Input
            placeholder={t("search.searchTags")}
            className="h-7 text-xs"
            value={tagSearch}
            onChange={(event) => setTagSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
            {filteredTags.map((tag) => {
              const selected = selectedTags.includes(tag.slug);
              const nextTags = selected ? selectedTags.filter((slug) => slug !== tag.slug) : [...selectedTags, tag.slug];
              return (
                <button
                  key={tag.id}
                  type="button"
                  className="px-2 py-0.5 text-[11px] rounded border transition-colors"
                  style={selected ? { backgroundColor: tag.color, color: "white", borderColor: tag.color } : { borderColor: `${tag.color}40`, color: tag.color }}
                  onClick={() => updateFilter("tag", nextTags.length ? nextTags.join(",") : null)}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
