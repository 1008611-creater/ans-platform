"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Play, Code2, FileJson, FileText, Video, Music, Image as ImageIcon, MessageSquare, Terminal, AlertCircle, XCircle, ChevronDown, ChevronUp, ChevronRight, Dices, Loader2, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { RunPromptButton } from "@/components/prompts/run-prompt-button";

import { type ApiItem } from "@/data/api-docs";

// Import separated components
import { ApiDocsSidebar } from "./api-docs-sidebar";
import { ApiDetailsPopup } from "./api-details-popup";
import { type OutputFormat } from "./types";
import {
  type IdeConsoleEntry,
  extractMonacoTypeErrors,
  evaluateIdePromptCode,
  injectTsIgnoreComments,
  setupCodeEditorMount,
  setupPreviewEditorMount,
} from "./prompt-ide-runtime";

import { useRouter } from "next/navigation";

// Import examples as raw text
import {
  EXAMPLE_VIDEO,
  EXAMPLE_AUDIO,
  EXAMPLE_IMAGE,
  EXAMPLE_CHAT,
} from "./examples";

export function PromptIde() {
  const t = useTranslations("ide");
  const { theme } = useTheme();
  const { data: session } = useSession();
  
  // Load saved code from localStorage or use default
  const [code, setCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('promptBuilderCode');
      if (saved) return saved;
    }
    return EXAMPLE_IMAGE;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedApiItem, setSelectedApiItem] = useState<ApiItem | null>(null);
  const [lastValidOutput, setLastValidOutput] = useState<string>("");
  const [consoleErrors, setConsoleErrors] = useState<IdeConsoleEntry[]>([]); 
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [consoleHeight, setConsoleHeight] = useState(128); // min height
  const monacoRef = useRef<unknown>(null);
  const editorRef = useRef<unknown>(null);
  const previewEditorRef = useRef<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewDecorationsRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  
  // Check if code has imports other than 'ANS'
  const hasExternalImports = useCallback(() => {
    const importRegex = /^import\s+.*?from\s+['"](.+?)['"];?\s*$/gm;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('ANS')) {
        return true;
      }
    }
    return false;
  }, [code]);

  const cannotEvaluate = hasExternalImports();

  const getTypeErrors = useCallback(() => {
    return extractMonacoTypeErrors(monacoRef.current, editorRef.current);
  }, []);

  const runCode = useCallback((showErrors = true) => {
    if (!session?.user) {
      setError("Authentication required to run code");
      setConsoleErrors([{ type: 'error', message: 'You must be logged in to execute code. Please sign in to use the IDE.' }]);
      return;
    }
    
    setIsRunning(true);
    const typeErrors = getTypeErrors();
    try {
      const res = evaluateIdePromptCode(code, outputFormat);
      if (res.ok) {
        setError(null);
        if (showErrors) {
          setConsoleErrors([...typeErrors, ...res.consoleLogs]);
        }
        setOutput(res.formattedOutput);
        if (res.formattedOutput) {
          setLastValidOutput(res.formattedOutput);
        }
      } else {
        const runtimeError: IdeConsoleEntry = { type: "error", message: res.errorMessage };
        setError(runtimeError.message);
        if (showErrors) {
          setConsoleErrors([...typeErrors, ...res.consoleLogs, runtimeError]);
          setIsConsoleOpen(true);
        }
      }
    } finally {
      setIsRunning(false);
    }
  }, [code, outputFormat, getTypeErrors, session?.user]);

  // Auto-run code with debounce when code changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (!cannotEvaluate) {
        runCode(true);
      }
    }, 500); // 500ms debounce
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [code, cannotEvaluate, runCode]);

  // Re-run when output format changes
  useEffect(() => {
    if (output || error) {
      runCode(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputFormat]);

  // Save code to localStorage on change
  useEffect(() => {
    localStorage.setItem('promptBuilderCode', code);
  }, [code]);

  const handleEditorMount = useCallback((_editor: unknown, monaco: unknown) => {
    monacoRef.current = monaco;
    editorRef.current = _editor;
    setupCodeEditorMount(_editor, monaco, previewEditorRef, previewDecorationsRef, () => {
      const typeErrors = getTypeErrors();
      setConsoleErrors(prev => {
        const runtimeErrors = prev.filter(e => !e.line);
        return [...typeErrors, ...runtimeErrors];
      });
    });
  }, [getTypeErrors]);

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output);
    toast.success(t("copied"));
  }, [output, t]);

  const router = useRouter();

  const createPrompt = useCallback(() => {
    const promptContent = output || lastValidOutput;
    if (!promptContent) {
      toast.error("Run the code first to generate a prompt");
      return;
    }
    
    // Detect output type based on the code's import
    let promptType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" = "TEXT";
    if (code.includes("video()")) promptType = "VIDEO";
    else if (code.includes("audio()")) promptType = "AUDIO";
    else if (code.includes("image()")) promptType = "IMAGE";
    
    // Detect format based on current outputFormat
    let format: "JSON" | "YAML" | undefined;
    if (outputFormat === "json") format = "JSON";
    else if (outputFormat === "yaml") format = "YAML";
    
    // Store data in sessionStorage to avoid query string size limits
    const builderData = {
      content: promptContent,
      type: promptType,
      format,
    };
    sessionStorage.setItem("promptBuilderData", JSON.stringify(builderData));
    
    router.push("/prompts/new?from=builder");
  }, [output, lastValidOutput, router, code, outputFormat]);

  // Add @ts-ignore comments before lines with type errors
  const ignoreTypeErrors = useCallback(() => {
    const updated = injectTsIgnoreComments(code, monacoRef.current, editorRef.current);
    if (updated !== null) {
      setCode(updated);
    }
  }, [code]);
  
  const generateExample = useCallback(async () => {
    if (!session?.user) {
      toast.error(t("loginToGenerate"));
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch("/api/prompt-builder/generate-example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          toast.error(t("rateLimitExceeded", { seconds: data.resetIn }));
        } else {
          toast.error(data.error || t("generateFailed"));
        }
        return;
      }
      
      if (data.code) {
        setCode(data.code);
        toast.success(t("exampleGenerated"));
      }
    } catch {
      toast.error(t("generateFailed"));
    } finally {
      setIsGenerating(false);
    }
  }, [session, t]);

  // Console resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = consoleHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [consoleHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.max(128, Math.min(500, startHeightRef.current + delta));
      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* API Docs sidebar */}
        <div className="relative flex flex-col">
          <ApiDocsSidebar selectedItem={selectedApiItem} onSelectItem={setSelectedApiItem} />
          {selectedApiItem && (
            <ApiDetailsPopup item={selectedApiItem} onClose={() => setSelectedApiItem(null)} />
          )}
        </div>

        {/* Editor panel */}
        <div className="flex-1 flex flex-col border-r min-w-0 min-h-0 overflow-hidden">
          <div className="h-10 px-4 border-b bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">{t("editor")}</span>
              <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">⌥ + Space</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={() => setCode(EXAMPLE_IMAGE)}
              >
                <ImageIcon className="h-3 w-3" />
                Image
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={() => setCode(EXAMPLE_VIDEO)}
              >
                <Video className="h-3 w-3" />
                Video
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={() => setCode(EXAMPLE_AUDIO)}
              >
                <Music className="h-3 w-3" />
                Audio
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={() => setCode(EXAMPLE_CHAT)}
              >
                <MessageSquare className="h-3 w-3" />
                Chat
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={generateExample}
                disabled={isGenerating || !session?.user}
                title={!session?.user ? t("loginToGenerate") : t("generateRandom")}
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Dices className="h-3 w-3" />
                )}
                {t("random")}
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              value={code}
              onChange={(value) => setCode(value || "")}
              theme={theme === "dark" ? "vs-dark" : "light"}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>

        {/* Preview panel */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div className="h-10 px-4 border-b bg-muted/30 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-muted-foreground">{t("preview")}</span>
            <div className="flex items-center gap-2">
              <Tabs value={outputFormat} onValueChange={(v) => setOutputFormat(v as OutputFormat)}>
                <TabsList className="h-8">
                  <TabsTrigger value="markdown" className="text-xs gap-1 px-2 h-6">
                    <FileText className="h-3 w-3" />
                    MD
                  </TabsTrigger>
                  <TabsTrigger value="json" className="text-xs gap-1 px-2 h-6">
                    <FileJson className="h-3 w-3" />
                    JSON
                  </TabsTrigger>
                  <TabsTrigger value="yaml" className="text-xs gap-1 px-2 h-6">
                    <FileText className="h-3 w-3" />
                    YAML
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {(output || lastValidOutput) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={copyOutput}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {(output || lastValidOutput) ? (
              <Editor
                height="100%"
                language={outputFormat === "json" ? "json" : outputFormat === "yaml" ? "yaml" : "markdown"}
                value={output || lastValidOutput}
                theme={theme === "dark" ? "vs-dark" : "light"}
                onMount={(previewEditor) => {
                  previewEditorRef.current = previewEditor;
                  setupPreviewEditorMount(previewEditor, editorRef, previewDecorationsRef);
                }}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "off",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                  padding: { top: 16, bottom: 16 },
                  folding: true,
                  renderLineHighlight: "none",
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                {cannotEvaluate ? (
                  <>
                    <Code2 className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm text-center px-4">{t("cannotEvaluate")}<br />{t("onlyPromptsChat", { library: "ANS" })}</p>
                  </>
                ) : (
                  <>
                    <Play className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm">{t("runToPreview")}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action buttons above console */}
          <div className="border-t bg-background px-4 py-2 flex items-center justify-between shrink-0">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2"
            >
              <a href="https://github.com/1008611-creater/ans-platform/blob/main/packages/ANS/API.md" target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" />
                Docs
              </a>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={createPrompt}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("createPrompt")}
              </Button>
              <RunPromptButton
                content={output || lastValidOutput}
                size="sm"
                variant="default"
              />
            </div>
          </div>

          {/* Console panel - inside preview section */}
          <div className="border-t bg-background shrink-0">
            {/* Resize handle */}
            {isConsoleOpen && (
              <div
                onMouseDown={handleResizeStart}
                className="h-1 cursor-ns-resize hover:bg-primary/50 transition-colors"
              />
            )}
            <div className="h-8 px-4 flex items-center justify-between">
              <button
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                className="flex items-center gap-2 hover:bg-muted/50 transition-colors rounded px-1 -ml-1"
              >
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Console</span>
                {consoleErrors.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    consoleErrors.some(e => e.type === 'error') 
                      ? 'bg-destructive/20 text-destructive' 
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {consoleErrors.length}
                  </span>
                )}
                {isConsoleOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {consoleErrors.some(e => e.type === 'error' && e.line) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs px-2"
                  onClick={ignoreTypeErrors}
                >
                  {t("ignoreTypeErrors")}
                </Button>
              )}
            </div>
            {isConsoleOpen && (
              <div style={{ height: consoleHeight }} className="overflow-auto bg-muted/50 dark:bg-zinc-900 font-mono text-xs">
                {consoleErrors.length === 0 ? (
                  <div className="p-3 text-muted-foreground">No output</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {consoleErrors.map((err, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-1.5 rounded ${
                          err.type === 'error' 
                            ? 'text-red-600 dark:text-red-400 bg-red-500/10' 
                            : err.type === 'warning'
                            ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10'
                            : 'text-foreground bg-transparent'
                        }`}
                      >
                        {err.type === 'error' ? (
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        ) : err.type === 'warning' ? (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                        )}
                        <span className="flex-1 whitespace-pre-wrap">
                          {err.line && <span className="text-muted-foreground">[{err.line}:{err.column}] </span>}
                          {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
