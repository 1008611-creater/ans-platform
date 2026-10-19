import {
  builder,
  fromPrompt,
  templates,
  video,
  audio,
  image,
  chat,
  chatPresets,
  variables,
  similarity,
  quality,
  parser,
} from "prompts.chat";
import { TYPE_DEFINITIONS } from "@/data/type-definitions";
import { TYPE_OPTIONS } from "@/data/method-options";
import { toYaml } from "./utils";
import { type OutputFormat } from "./types";

export interface IdeConsoleEntry {
  type: "error" | "warning" | "info";
  message: string;
  line?: number;
  column?: number;
}

export function extractMonacoTypeErrors(monacoInstance: unknown, editorInstance: unknown): IdeConsoleEntry[] {
  if (!monacoInstance || !editorInstance) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monaco = monacoInstance as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = editorInstance as any;
  const model = editor.getModel();
  if (!model) return [];

  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  return markers
    .filter((m: { severity: number }) => m.severity >= 4)
    .map((m: { message: string; startLineNumber: number; startColumn: number; severity: number }) => {
      let message = m.message;
      const typeMatch = message.match(/parameter of type '([^']+)'/);
      if (typeMatch) {
        const typeStr = typeMatch[1];
        const typeNames = typeStr.split("|").map(t => t.trim());
        const allOptions: string[] = [];

        for (const typeName of typeNames) {
          const options = TYPE_OPTIONS[typeName];
          if (options) {
            allOptions.push(...options);
          }
        }

        const uniqueOptions = [...new Set(allOptions)];
        if (uniqueOptions.length > 0) {
          message += `\n  Valid: ${uniqueOptions.map(o => `'${o}'`).join(", ")}`;
        }
      }

      return {
        type: m.severity === 8 ? ("error" as const) : ("warning" as const),
        message,
        line: m.startLineNumber,
        column: m.startColumn,
      };
    });
}

export function formatIdeOutputValue(result: unknown, outputFormat: OutputFormat): string {
  if (!result) return "";

  const isExportFormat =
    typeof result === "object" &&
    result !== null &&
    ("json" in result || "yaml" in result || "markdown" in result);

  if (isExportFormat) {
    const exportResult = result as { json?: unknown; yaml?: unknown; markdown?: unknown };
    let outputValue: unknown;
    switch (outputFormat) {
      case "json":
        outputValue = exportResult.json ?? exportResult.yaml ?? exportResult.markdown;
        return typeof outputValue === "string" ? outputValue : JSON.stringify(outputValue, null, 2);
      case "yaml":
        outputValue = exportResult.yaml ?? exportResult.json ?? exportResult.markdown;
        return typeof outputValue === "string" ? outputValue : toYaml(outputValue);
      case "markdown":
        outputValue = exportResult.markdown ?? exportResult.json ?? exportResult.yaml;
        return typeof outputValue === "string" ? outputValue : JSON.stringify(outputValue, null, 2);
    }
  }

  switch (outputFormat) {
    case "json":
      return JSON.stringify(result, null, 2);
    case "yaml":
      return toYaml(result);
    case "markdown":
      if (typeof result === "string") return result;
      if (typeof result === "object" && result !== null) {
        if ("content" in result) return (result as { content: string }).content;
        if ("prompt" in result) return (result as { prompt: string }).prompt;
        if ("systemPrompt" in result) return (result as { systemPrompt: string }).systemPrompt;
        return JSON.stringify(result, null, 2);
      }
      return String(result);
  }
}

export function evaluateIdePromptCode(
  code: string,
  outputFormat: OutputFormat
): {
  ok: true;
  formattedOutput: string;
  consoleLogs: IdeConsoleEntry[];
} | {
  ok: false;
  errorMessage: string;
  consoleLogs: IdeConsoleEntry[];
} {
  const consoleLogs: IdeConsoleEntry[] = [];
  const formatArgs = (args: unknown[]) =>
    args.map(a => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ");

  const mockConsole = {
    log: (...args: unknown[]) => consoleLogs.push({ type: "info", message: formatArgs(args) }),
    info: (...args: unknown[]) => consoleLogs.push({ type: "info", message: formatArgs(args) }),
    warn: (...args: unknown[]) => consoleLogs.push({ type: "warning", message: formatArgs(args) }),
    error: (...args: unknown[]) => consoleLogs.push({ type: "error", message: formatArgs(args) }),
  };

  try {
    let transformedCode = code
      .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, "")
      .replace(/^export\s+(?!default)/gm, "")
      .trim();

    const exportDefaultMatch = transformedCode.match(/^export\s+default\s+/m);
    if (exportDefaultMatch) {
      const idx = transformedCode.indexOf(exportDefaultMatch[0]);
      transformedCode =
        transformedCode.substring(0, idx) +
        "return " +
        transformedCode.substring(idx + exportDefaultMatch[0].length);
    }

    const lines = transformedCode.split("\n");
    const lastLine = lines[lines.length - 1].trim();
    const hasReturn = transformedCode.includes("return ");
    if (!hasReturn) {
      if (
        lastLine &&
        !lastLine.endsWith(";") &&
        !lastLine.startsWith("//") &&
        !lastLine.startsWith("/*") &&
        !lastLine.startsWith("}")
      ) {
        lines[lines.length - 1] = `return ${lastLine}`;
        transformedCode = lines.join("\n");
      } else if (
        lastLine.endsWith(";") &&
        !lastLine.includes("=") &&
        !lastLine.startsWith("const ") &&
        !lastLine.startsWith("let ") &&
        !lastLine.startsWith("var ") &&
        !lastLine.startsWith("}")
      ) {
        lines[lines.length - 1] = `return ${lastLine.slice(0, -1)}`;
        transformedCode = lines.join("\n");
      }
    }

    const fn = new Function(
      "builder",
      "fromPrompt",
      "templates",
      "video",
      "audio",
      "image",
      "chat",
      "chatPresets",
      "variables",
      "similarity",
      "quality",
      "parser",
      "console",
      transformedCode
    );
    const result = fn(
      builder,
      fromPrompt,
      templates,
      video,
      audio,
      image,
      chat,
      chatPresets,
      variables,
      similarity,
      quality,
      parser,
      mockConsole
    );

    const formattedOutput = formatIdeOutputValue(result, outputFormat);
    return { ok: true, formattedOutput, consoleLogs };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : "An error occurred",
      consoleLogs,
    };
  }
}

export function injectTsIgnoreComments(
  code: string,
  monacoInstance: unknown,
  editorInstance: unknown
): string | null {
  if (!monacoInstance || !editorInstance) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monaco = monacoInstance as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = editorInstance as any;
  const model = editor.getModel();
  if (!model) return null;

  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  const typeErrors = markers.filter(
    (m: { severity: number; message: string }) =>
      m.severity >= 4 && m.message.includes("is not assignable to")
  );
  if (typeErrors.length === 0) return null;

  const lines = code.split("\n");
  const errorLineNums: number[] = typeErrors.map((e: { startLineNumber: number }) => e.startLineNumber);
  const uniqueLines = [...new Set(errorLineNums)].sort((a, b) => b - a);

  for (const lineNum of uniqueLines) {
    const lineIndex = lineNum - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      if (lineIndex > 0 && lines[lineIndex - 1].includes("@ts-ignore")) continue;
      const indent = lines[lineIndex].match(/^(\s*)/)?.[1] || "";
      lines.splice(lineIndex, 0, `${indent}// @ts-ignore`);
    }
  }

  return lines.join("\n");
}

export function setupCodeEditorMount(
  _editor: unknown,
  monaco: unknown,
  previewEditorRef: { current: unknown },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewDecorationsRef: { current: any },
  onMarkersChange: () => void
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = monaco as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = _editor as any;

  const getQuotedStringAtPosition = (lineContent: string, column: number) => {
    const col = column - 1;
    let quoteChar = null;
    let quoteStart = -1;
    for (let i = col - 1; i >= 0; i--) {
      if (lineContent[i] === '"' || lineContent[i] === "'") {
        quoteChar = lineContent[i];
        quoteStart = i;
        break;
      }
    }
    if (quoteStart === -1) return null;

    let quoteEnd = -1;
    for (let i = col; i < lineContent.length; i++) {
      if (lineContent[i] === quoteChar) {
        quoteEnd = i;
        break;
      }
    }
    if (quoteEnd === -1 || col < quoteStart || col > quoteEnd) return null;
    return lineContent.substring(quoteStart + 1, quoteEnd);
  };

  editor.onMouseDown((e: { target: { position?: { lineNumber: number; column: number } } }) => {
    if (!e.target.position) return;
    const model = editor.getModel();
    if (!model) return;

    const lineContent = model.getLineContent(e.target.position.lineNumber);
    const quotedString = getQuotedStringAtPosition(lineContent, e.target.position.column);
    if (!quotedString || quotedString.length < 2) return;

    if (previewDecorationsRef.current) {
      previewDecorationsRef.current.clear();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previewEditor = previewEditorRef.current as any;
    if (!previewEditor) return;
    const previewModel = previewEditor.getModel();
    if (!previewModel) return;

    const escapedText = quotedString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const previewMatches = previewModel.findMatches(escapedText, true, false, true, null, true);
    if (previewMatches.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decorations = previewMatches.map((match: any) => ({
        range: match.range,
        options: {
          className: "wordHighlight",
          inlineClassName: "bg-yellow-300/50 dark:bg-yellow-500/30 rounded",
        },
      }));
      previewDecorationsRef.current = previewEditor.createDecorationsCollection(decorations);
    }
  });

  m.editor.onDidChangeMarkers?.(onMarkersChange);
  m.languages?.typescript?.typescriptDefaults?.addExtraLib(TYPE_DEFINITIONS, "ANS.d.ts");
  m.languages?.typescript?.typescriptDefaults?.setCompilerOptions({
    target: 99,
    allowNonTsExtensions: true,
    moduleResolution: 2,
    module: 99,
    noEmit: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
  });
  m.languages?.typescript?.typescriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  editor?.updateOptions?.({
    quickSuggestions: { strings: true, comments: false, other: true },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    wordBasedSuggestions: "off",
    parameterHints: { enabled: true },
  });

  editor?.addAction?.({
    id: "trigger-suggestions",
    label: "Trigger Suggestions",
    keybindings: [m.KeyMod.Alt | m.KeyCode.Space],
    run: () => {
      editor.trigger("keyboard", "editor.action.triggerSuggest", {});
    },
  });
}

export function setupPreviewEditorMount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewEditor: any,
  codeEditorRef: { current: unknown },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewDecorationsRef: { current: any }
) {
  const getQuotedStringAtMatch = (
    model: unknown,
    range: { startLineNumber: number; startColumn: number; endColumn: number }
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mdl = model as any;
    const lineContent = mdl.getLineContent(range.startLineNumber);
    const matchStart = range.startColumn - 1;

    let quoteChar = null;
    let quoteStart = -1;
    for (let i = matchStart - 1; i >= 0; i--) {
      if (lineContent[i] === '"' || lineContent[i] === "'") {
        quoteChar = lineContent[i];
        quoteStart = i;
        break;
      }
    }
    if (quoteStart === -1) return null;

    let quoteEnd = -1;
    for (let i = matchStart; i < lineContent.length; i++) {
      if (lineContent[i] === quoteChar) {
        quoteEnd = i;
        break;
      }
    }
    if (quoteEnd === -1) return null;

    return {
      content: lineContent.substring(quoteStart + 1, quoteEnd),
      range: {
        startLineNumber: range.startLineNumber,
        startColumn: quoteStart + 2,
        endLineNumber: range.startLineNumber,
        endColumn: quoteEnd + 1,
      },
    };
  };

  previewEditor.onMouseDown((e: { target: { position?: { lineNumber: number; column: number } } }) => {
    if (!e.target.position) return;
    const model = previewEditor.getModel();
    if (!model) return;

    const wordInfo = model.getWordAtPosition(e.target.position);
    if (!wordInfo || !wordInfo.word || wordInfo.word.length < 2) return;
    const word = wordInfo.word;

    if (previewDecorationsRef.current) {
      previewDecorationsRef.current.clear();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const codeEditor = codeEditorRef.current as any;
    if (!codeEditor) return;
    const codeModel = codeEditor.getModel();
    if (!codeModel) return;

    const matches = codeModel.findMatches(`\\b${word}\\b`, true, true, true, null, true);
    if (matches.length === 0) return;

    const firstMatch = matches[0];
    const quotedString = getQuotedStringAtMatch(codeModel, firstMatch.range);

    let searchText = word;
    let selectionRange = firstMatch.range;
    if (quotedString) {
      searchText = quotedString.content;
      selectionRange = quotedString.range;
    }

    codeEditor.setSelection(selectionRange);
    codeEditor.revealLineInCenter(selectionRange.startLineNumber);
    codeEditor.focus();

    const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const previewMatches = model.findMatches(escapedText, true, false, true, null, true);
    if (previewMatches.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decorations = previewMatches.map((m: any) => ({
        range: m.range,
        options: {
          className: "wordHighlight",
          inlineClassName: "bg-yellow-300/50 dark:bg-yellow-500/30 rounded",
        },
      }));
      previewDecorationsRef.current = previewEditor.createDecorationsCollection(decorations);
    }
  });
}
