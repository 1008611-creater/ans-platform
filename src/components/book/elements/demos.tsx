"use client";

import { useState, useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { getLocaleField } from "./locales";

// Tokenizer Demo Component - simulates BPE-style tokenization
function simulateTokenization(text: string): string[] {
  if (!text) return [];
  
  const tokens: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    if (text[i] === ' ') {
      let chunk = ' ';
      i++;
      const chunkLen = Math.min(2 + Math.floor(Math.random() * 3), text.length - i);
      for (let j = 0; j < chunkLen && i < text.length && text[i] !== ' '; j++) {
        chunk += text[i];
        i++;
      }
      tokens.push(chunk);
    } else if (/[.,!?;:'"()\[\]{}]/.test(text[i])) {
      tokens.push(text[i]);
      i++;
    } else {
      const chunkLen = Math.min(2 + Math.floor(Math.random() * 3), text.length - i);
      let chunk = '';
      for (let j = 0; j < chunkLen && i < text.length && text[i] !== ' ' && !/[.,!?;:'"()\[\]{}]/.test(text[i]); j++) {
        chunk += text[i];
        i++;
      }
      if (chunk) tokens.push(chunk);
    }
  }
  
  return tokens;
}

const sampleTokenizations: Record<string, string[]> = {
  "Hello, world!": ["Hel", "lo", ",", " wor", "ld", "!"],
  "Unbelievable": ["Un", "bel", "iev", "able"],
  "ChatGPT is amazing": ["Chat", "GPT", " is", " amaz", "ing"],
  "The quick brown fox": ["The", " qui", "ck", " bro", "wn", " fox"],
  "Prompt engineering": ["Prom", "pt", " eng", "ine", "ering"],
  "Artificial Intelligence": ["Art", "ific", "ial", " Int", "ell", "igen", "ce"],
};

export function TokenizerDemo() {
  const t = useTranslations("book.interactive");
  const locale = useLocale();

  const currentData = getLocaleField(locale, "tokenizer");
  
  // Get the default sample's text and tokens
  const defaultSample = currentData.samples[currentData.default];
  const [input, setInput] = useState(defaultSample?.text || "");
  const [tokens, setTokens] = useState<string[]>(defaultSample?.tokens || []);

  // Update input and tokens when locale changes
  useEffect(() => {
    const sample = currentData.samples[currentData.default];
    if (sample) {
      setInput(sample.text);
      setTokens(sample.tokens);
    }
  }, [locale, currentData]);

  const handleInputChange = (value: string) => {
    setInput(value);
    // Check if input matches any sample text
    const matchingSample = Object.values(currentData.samples).find(s => s.text === value);
    if (matchingSample) {
      setTokens(matchingSample.tokens);
    } else {
      setTokens(simulateTokenization(value));
    }
  };

  const tokenColors = [
    "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700",
    "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700",
    "bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700",
    "bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700",
    "bg-pink-100 dark:bg-pink-900/50 border-pink-300 dark:border-pink-700",
    "bg-cyan-100 dark:bg-cyan-900/50 border-cyan-300 dark:border-cyan-700",
  ];

  return (
    <div className="my-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <span className="font-semibold">{t("tokenizerDemo")}</span>
        <span className="text-muted-foreground text-sm ml-2">{t("seeHowTextIsSplit")}</span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{t("enterText")}</label>
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Type something..."
          />
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-2">{t("tokens")} ({tokens.length}):</div>
          <div className="flex flex-wrap gap-1">
            {tokens.map((token, i) => (
              <span
                key={i}
                className={cn(
                  "px-2 py-1 rounded border text-sm font-mono",
                  tokenColors[i % tokenColors.length]
                )}
              >
                {token === " " ? "␣" : token}
              </span>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {currentData.tryExamples}
        </div>
      </div>
    </div>
  );
}

// Context Window Demo Component
export function ContextWindowDemo() {
  const [promptLength, setPromptLength] = useState(2000);
  const [responseLength, setResponseLength] = useState(1000);
  const contextLimit = 8000;
  const t = useTranslations("book.interactive");
  
  const totalUsed = promptLength + responseLength;
  const remaining = Math.max(0, contextLimit - totalUsed);
  const isOverLimit = totalUsed > contextLimit;

  return (
    <div className="my-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <span className="font-semibold">{t("contextWindowVisualizer")}</span>
        <span className="text-muted-foreground text-sm ml-2">{t("understandHowContextIsConsumed")}</span>
      </div>
      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t("contextWindow")}: {contextLimit.toLocaleString()} tokens</span>
            <span className={cn(
              "font-mono",
              isOverLimit ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
              {remaining.toLocaleString()} {t("remaining")}
            </span>
          </div>
          <div className="h-8 bg-muted rounded-lg overflow-hidden flex">
            <div 
              className="bg-blue-500 transition-all duration-300 flex items-center justify-center text-xs text-white font-medium"
              style={{ width: `${Math.min((promptLength / contextLimit) * 100, 100)}%` }}
            >
              {promptLength > 500 && t("prompt")}
            </div>
            <div 
              className={cn(
                "transition-all duration-300 flex items-center justify-center text-xs text-white font-medium",
                isOverLimit ? "bg-red-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min((responseLength / contextLimit) * 100, 100 - (promptLength / contextLimit) * 100)}%` }}
            >
              {responseLength > 500 && t("response")}
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>{(contextLimit / 2).toLocaleString()}</span>
            <span>{contextLimit.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm flex justify-between mb-1">
              <span>{t("yourPrompt")}</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono">{promptLength.toLocaleString()} tokens</span>
            </label>
            <input
              type="range"
              min="100"
              max="6000"
              value={promptLength}
              onChange={(e) => setPromptLength(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
          <div>
            <label className="text-sm flex justify-between mb-1">
              <span>{t("aiResponse")}</span>
              <span className="text-green-600 dark:text-green-400 font-mono">{responseLength.toLocaleString()} tokens</span>
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              value={responseLength}
              onChange={(e) => setResponseLength(Number(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>
        </div>

        <div className={cn(
          "p-3 rounded-lg text-sm",
          isOverLimit 
            ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
        )}>
          {isOverLimit ? (
            <p><span className="font-bold">{t("contextOverflow")}</span> {t("contextOverflowMessage")}</p>
          ) : (
            <p><span className="font-bold">{t("tipLabel")}</span> {t("contextTip")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Temperature Demo Component
export function TemperatureDemo() {
  const [temperature, setTemperature] = useState(0.7);
  const t = useTranslations("book.interactive");
  const locale = useLocale();

  // Get locale-specific temperature examples
  const currentExamples = useMemo(() => {
    return getLocaleField(locale, "temperatureExamples");
  }, [locale]);

  const getOutputExamples = (temp: number): string[] => {
    if (temp <= 0.2) return currentExamples.lowTemp;
    if (temp <= 0.5) return currentExamples.mediumLowTemp;
    if (temp <= 0.8) return currentExamples.mediumHighTemp;
    return currentExamples.highTemp;
  };

  const getLabel = (temp: number): { textKey: string; color: string } => {
    if (temp <= 0.3) return { textKey: "deterministic", color: "text-blue-600 dark:text-blue-400" };
    if (temp <= 0.6) return { textKey: "balanced", color: "text-green-600 dark:text-green-400" };
    if (temp <= 0.8) return { textKey: "creative", color: "text-amber-600 dark:text-amber-400" };
    return { textKey: "veryCreative", color: "text-pink-600 dark:text-pink-400" };
  };

  const label = getLabel(temperature);
  const examples = getOutputExamples(temperature);

  return (
    <div className="my-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <span className="font-semibold">{t("temperatureDemo")}</span>
        <span className="text-muted-foreground text-sm ml-2">{t("seeHowRandomnessAffects")}</span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">{t("temperature")}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg">{temperature.toFixed(1)}</span>
              <span className={cn("text-sm font-medium", label.color)}>{t(label.textKey)}</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0.0 ({t("focused")})</span>
            <span>1.0 ({t("random")})</span>
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground mb-2">Prompt: "{currentExamples.prompt}"</div>
          <div className="text-sm font-medium mb-2">{t("possibleResponsesAtThisTemp")}</div>
          <div className="space-y-2">
            {examples.map((example, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded text-sm font-mono">
                {example}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg text-sm bg-muted/30 border">
          <span className="font-bold">{t("useLowTemperature")}</span> {t("forFactualAnswers")} <span className="font-bold">{t("useHighTemperature")}</span> {t("forCreativeWriting")}
        </div>
      </div>
    </div>
  );
}

// Structured Output Demo Component
export function StructuredOutputDemo() {
  const [activeFormat, setActiveFormat] = useState<'unstructured' | 'json' | 'table'>('unstructured');
  const t = useTranslations("book.interactive");

  const outputs = {
    unstructured: `Here are some popular programming languages: Python is great for data science and AI. JavaScript is used for web development. Rust is known for performance and safety. Go is good for backend services. Each has its strengths depending on your use case.`,
    json: `{
  "languages": [
    {
      "name": "Python",
      "best_for": ["data science", "AI"],
      "difficulty": "easy"
    },
    {
      "name": "JavaScript", 
      "best_for": ["web development"],
      "difficulty": "medium"
    },
    {
      "name": "Rust",
      "best_for": ["performance", "safety"],
      "difficulty": "hard"
    },
    {
      "name": "Go",
      "best_for": ["backend services"],
      "difficulty": "medium"
    }
  ]
}`,
    table: `| Language   | Best For            | Difficulty |
|------------|---------------------|------------|
| Python     | Data science, AI    | Easy       |
| JavaScript | Web development     | Medium     |
| Rust       | Performance, Safety | Hard       |
| Go         | Backend services    | Medium     |`,
  };

  const benefits = {
    unstructured: [
      { text: t("parseProgrammatically"), supported: false },
      { text: t("compareAcrossQueries"), supported: false },
      { text: t("integrateIntoWorkflows"), supported: false },
      { text: t("validateForCompleteness"), supported: false },
    ],
    json: [
      { text: t("parseProgrammatically"), supported: true },
      { text: t("compareAcrossQueries"), supported: true },
      { text: t("integrateIntoWorkflows"), supported: true },
      { text: t("validateForCompleteness"), supported: true },
    ],
    table: [
      { text: t("parseProgrammatically"), supported: true },
      { text: t("compareAcrossQueries"), supported: true },
      { text: t("integrateIntoWorkflows"), supported: false },
      { text: t("validateForCompleteness"), supported: true },
    ],
  };

  return (
    <div className="my-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <span className="font-semibold">{t("structuredOutputDemo")}</span>
        <span className="text-muted-foreground text-sm ml-2">{t("seeTheDifferenceStructureMakes")}</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          {(['unstructured', 'json', 'table'] as const).map((format) => (
            <button
              key={format}
              onClick={() => setActiveFormat(format)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                activeFormat === format
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {format === 'unstructured' ? t("unstructured") : format.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">{t("output")}</div>
            <pre className="p-3 bg-muted/50 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
              {outputs[activeFormat]}
            </pre>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">{t("youCan")}</div>
            <div className="space-y-2">
              {benefits[activeFormat].map((benefit, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm transition-colors",
                    benefit.supported 
                      ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                  )}
                >
                  {benefit.supported ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 flex items-center justify-center">✗</span>
                  )}
                  {benefit.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">{t("parseProgrammaticallyLabel")}</div>
          {activeFormat === 'unstructured' ? (
            <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="whitespace-pre-wrap text-xs font-mono text-red-700 dark:text-red-300">
                {`// ❌ ${t("complexRegexRequired")}
const languages = text.match(/([A-Z][a-z]+) is (?:great for|used for|known for|good for) (.+?)\\./g);
// ${t("unreliableBreaksWithChanges")}`}
              </div>
            </div>
          ) : activeFormat === 'json' ? (
            <div className="p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="whitespace-pre-wrap text-xs font-mono text-green-700 dark:text-green-300">
                {`// ✓ ${t("simpleAndReliable")}
const data = JSON.parse(response);
const pythonInfo = data.languages.find(l => l.name === "Python");
console.log(pythonInfo.best_for); // ["data science", "AI"]`}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="whitespace-pre-wrap text-xs font-mono text-green-700 dark:text-green-300">
                {`// ✓ ${t("parseableWithMarkdown")}
const rows = parseMarkdownTable(response);
const pythonRow = rows.find(r => r.Language === "Python");
console.log(pythonRow["Best For"]); // "Data science, AI"`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export {
  FewShotDemo,
  JsonYamlDemo,
  IterativeRefinementDemo,
  CostCalculatorDemo,
} from "./demos-advanced";

