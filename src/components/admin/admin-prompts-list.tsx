"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Trash2,
  Loader2,
  Search,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
  Flag,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface PromptAuthor {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}

export interface PromptCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AdminPrompt {
  id: string;
  title: string;
  slug: string | null;
  type: string;
  isPrivate: boolean;
  isUnlisted: boolean;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: PromptAuthor;
  category: PromptCategory | null;
  _count: {
    votes: number;
    reports: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AdminPromptsListSection() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<AdminPrompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState(false);
  const [promptFilter, setPromptFilter] = useState("all");

  const fetchPrompts = useCallback(async (page: number, search: string, filter: string) => {
    setLoadingPrompts(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(filter !== "all" && { filter }),
      });
      const res = await fetch(`/api/admin/prompts?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch prompts");
      }

      setPrompts(data.prompts);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch prompts");
    } finally {
      setLoadingPrompts(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts(currentPage, searchQuery, promptFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, promptFilter, fetchPrompts]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPrompts(1, searchQuery, promptFilter);
  };

  const handleFilterChange = (value: string) => {
    setPromptFilter(value);
    setCurrentPage(1);
  };

  const handleDeletePrompt = async () => {
    if (!promptToDelete) return;

    setDeletingPrompt(true);
    try {
      const res = await fetch(`/api/admin/prompts/${promptToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete prompt");
      }

      toast.success(t("promptsList.deleted"));
      setPromptToDelete(null);
      fetchPrompts(currentPage, searchQuery, promptFilter);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete prompt");
    } finally {
      setDeletingPrompt(false);
    }
  };

  return (
    <>
      {/* Prompts List Section */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t("promptsList.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("promptsList.description")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={promptFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("promptsList.filters.all")}</SelectItem>
                <SelectItem value="public">{t("promptsList.filters.public")}</SelectItem>
                <SelectItem value="private">{t("promptsList.filters.private")}</SelectItem>
                <SelectItem value="unlisted">{t("promptsList.filters.unlisted")}</SelectItem>
                <SelectItem value="featured">{t("promptsList.filters.featured")}</SelectItem>
                <SelectItem value="reported">{t("promptsList.filters.reported")}</SelectItem>
                <SelectItem value="deleted">{t("promptsList.filters.deleted")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tCommon("search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 w-full sm:w-[200px]"
                />
              </div>
              <Button size="icon" variant="outline" onClick={handleSearch} disabled={loadingPrompts}>
                {loadingPrompts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile-friendly Prompts Cards */}
        <div className="space-y-3">
          {loadingPrompts && prompts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("promptsList.noPrompts")}
            </div>
          ) : (
            prompts.map((prompt) => (
              <div
                key={prompt.id}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">{prompt.title}</h4>
                      {prompt.isFeatured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                      {prompt.isPrivate && (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="h-3 w-3 mr-1" />
                          {t("promptsList.private")}
                        </Badge>
                      )}
                      {prompt.isUnlisted && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          {t("promptsList.unlisted")}
                        </Badge>
                      )}
                      {prompt._count.reports > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <Flag className="h-3 w-3 mr-1" />
                          {prompt._count.reports}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {prompt.type} • {prompt.viewCount} {t("promptsList.views")} • {prompt._count.votes} {t("promptsList.votes")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {prompt.id && (
                      <Link href={`/prompts/${prompt.id}`} target="_blank" prefetch={false}>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setPromptToDelete(prompt)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Author & Category Row */}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={prompt.author.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {prompt.author.name?.[0] || prompt.author.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground truncate">
                      @{prompt.author.username}
                    </span>
                  </div>
                  {prompt.category && (
                    <Badge variant="secondary" className="text-xs truncate max-w-[150px]">
                      {prompt.category.name}
                    </Badge>
                  )}
                </div>

                {/* Date Row */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("promptsList.created")}: {new Date(prompt.createdAt).toLocaleDateString()}</span>
                  <span className="font-mono text-[10px] opacity-50">{prompt.id.slice(0, 8)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t("promptsList.showing", {
                from: (pagination.page - 1) * pagination.limit + 1,
                to: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={currentPage === 1 || loadingPrompts}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums px-2">
                {currentPage} / {pagination.totalPages}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={currentPage === pagination.totalPages || loadingPrompts}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Single Prompt Confirmation Dialog */}
      <AlertDialog open={!!promptToDelete} onOpenChange={(open) => !open && setPromptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("promptsList.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("promptsList.deleteConfirmDescription", { title: promptToDelete?.title || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={deletingPrompt}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrompt}
              disabled={deletingPrompt}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deletingPrompt ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
