"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

// Few-Shot Demo Component
export function FewShotDemo() {
  const [exampleCount, setExampleCount] = useState(0);
  const t = useTranslations("book.interactive");
  const locale = useLocale();

  // Locale-specific few-shot examples
  const fewShotData = useMemo(() => ({
    en: {
      examples: [
        { input: "I love this product!", output: "Positive" },
        { input: "Terrible experience, waste of money", output: "Negative" },
        { input: "It's okay, nothing special", output: "Neutral" },
      ],
      testCase: { input: "Great quality but shipping was slow", expected: "Mixed" },
      labels: { positive: "Positive", negative: "Negative", neutral: "Neutral", mixed: "Mixed" },
    },
    tr: {
      examples: [
        { input: "Bu ürünü çok sevdim!", output: "Olumlu" },
        { input: "Berbat bir deneyim, para israfı", output: "Olumsuz" },
        { input: "Fena değil, özel bir şey yok", output: "Nötr" },
      ],
      testCase: { input: "Kalitesi harika ama kargo yavaştı", expected: "Karışık" },
      labels: { positive: "Olumlu", negative: "Olumsuz", neutral: "Nötr", mixed: "Karışık" },
    },
  }), []);

  const currentData = fewShotData[locale as keyof typeof fewShotData] || fewShotData.en;
  const examples = currentData.examples;
  const testCase = currentData.testCase;

  const getModelConfidence = (count: number): { label: string; confidence: number; correct: boolean } => {
    const { labels } = currentData;
    if (count === 0) return { label: labels.positive, confidence: 45, correct: false };
    if (count === 1) return { label: labels.positive, confidence: 62, correct: false };
    if (count === 2) return { label: labels.mixed, confidence: 71, correct: true };
    return { label: labels.mixed, confidence: 94, correct: true };
  };

  const result = getModelConfidence(exampleCount);

  return (
    <div className="my-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <span className="font-semibold">{t("fewShotLearningDemo")}</span>
        <span className="text-muted-foreground text-sm ml-2">{t("seeHowExamplesImproveAccuracy")}</span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">{t("numberOfExamples")}</span>
            <span className="font-mono text-lg">{exampleCount}</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            value={exampleCount}
            onChange={(e) => setExampleCount(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{t("zeroShot")}</span>
            <span>{t("oneShot")}</span>
            <span>{t("twoShot")}</span>
            <span>{t("threeShot")}</span>
          </div>
        </div>

        {exampleCount > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("examplesProvided")}</div>
            {examples.slice(0, exampleCount).map((ex, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded text-sm flex gap-2">
                <span className="text-muted-foreground shrink-0">&quot;{ex.input}&quot;</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">{ex.output}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">{t("testInput")}</div>
          <div className="p-3 bg-muted/30 rounded-lg mb-3">
            <span className="font-mono text-sm">&quot;{testCase.input}&quot;</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">{t("modelPrediction")}</div>
              <div className={cn(
                "p-2 rounded-lg font-semibold",
                result.correct 
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
              )}>
                {result.label} {result.correct ? "✓" : "✗"}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">{t("confidence")}</div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500 flex items-center justify-center text-xs text-white font-medium",
                    result.correct ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ width: `${result.confidence}%` }}
                >
                  {result.confidence}%
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {t("expected")} <span className="font-semibold">{testCase.expected}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// JSON/YAML Format Demo Component
export function JsonYamlDemo() {
  const [activeFormat, setActiveFormat] = useState<'json' | 'yaml' | 'typescript'>('typescript');
  const t = useTranslations("book.interactive");

  const typeDefinition = `interface ChatPersona {
  name?: string;
  role?: string;
  tone?: PersonaTone | PersonaTone[];
  expertise?: PersonaExpertise[];
  personality?: string[];
  background?: string;
}`;

  const jsonOutput = `{
  "name": "CodeReviewer",
  "role": "Senior Software Engineer",
  "tone": ["professional", "analytical"],
  "expertise": ["coding", "engineering"],
  "personality": ["thorough", "constructive"],
  "background": "10 years in backend systems"
}`;

  const yamlOutput = `name: CodeReviewer
role: Senior Software Engineer
tone:
  - professional
  - analytical
expertise:
  - coding
  - engineering
personality:
  - thorough
  - constructive
background: 10 years in backend systems`;

  const outputs = {
    typescript: typeDefinition,
    json: jsonOutput,
    yaml: yamlOutput,
  };

  const descriptions = {
    typescript: t("defineStructureWithTypeScript"),
    json: t("machineReadableStrictSyntax"),
    yaml: t("humanReadableSupportsComments"),
  };

  return (
    <div className="my-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <span className="font-semibold">{t("formatComparison")}</span>
        <span className="text-muted-foreground text-sm ml-2">{t("sameDataDifferentFormats")}</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          {(['typescript', 'json', 'yaml'] as const).map((format) => (
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
              {format === 'typescript' ? 'TypeScript' : format.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          {descriptions[activeFormat]}
        </div>

        <pre className={cn(
          "p-4 rounded-lg text-sm font-mono whitespace-pre overflow-x-auto",
          activeFormat === 'typescript' 
            ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            : activeFormat === 'json'
            ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            : "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
        )}>
          {outputs[activeFormat]}
        </pre>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className={cn(
            "p-2 rounded text-center",
            activeFormat === 'typescript' ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted/50"
          )}>
            <div className="font-semibold">TypeScript</div>
            <div className="text-muted-foreground">{t("defineSchema")}</div>
          </div>
          <div className={cn(
            "p-2 rounded text-center",
            activeFormat === 'json' ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted/50"
          )}>
            <div className="font-semibold">JSON</div>
            <div className="text-muted-foreground">{t("apisAndParsing")}</div>
          </div>
          <div className={cn(
            "p-2 rounded text-center",
            activeFormat === 'yaml' ? "bg-purple-100 dark:bg-purple-900/30" : "bg-muted/50"
          )}>
            <div className="font-semibold">YAML</div>
            <div className="text-muted-foreground">{t("configFiles")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Iterative Refinement Demo Component
const iterationsLocale: Record<string, Array<{ version: number; prompt: string; additions: string[] | null; output: string; issue: string | null; quality: number }>> = {
  en: [
    { version: 1, prompt: "Write a product description.", additions: null, output: "This is a great product. It has many features. You should buy it.", issue: "Too vague, no specific details", quality: 20 },
    { version: 2, prompt: "Write a product description for wireless earbuds.", additions: ["for wireless earbuds"], output: "These wireless earbuds offer great sound quality and comfortable fit. They have long battery life and come in multiple colors.", issue: "Better, but still generic", quality: 45 },
    { version: 3, prompt: "Write a 50-word product description for premium wireless earbuds. Highlight: noise cancellation, 8-hour battery, water resistance.", additions: ["50-word", "premium", "Highlight: noise cancellation, 8-hour battery, water resistance"], output: "Experience pure audio bliss with our premium wireless earbuds. Advanced noise cancellation blocks distractions while delivering crystal-clear sound. With 8-hour battery life and IPX5 water resistance, they're perfect for workouts or commutes. Ergonomic design ensures all-day comfort.", issue: "Good details, needs stronger hook", quality: 72 },
    { version: 4, prompt: "Write a compelling 50-word product description for premium wireless earbuds.\n\nKey features: noise cancellation, 8-hour battery, IPX5 water resistance\nTone: Premium but approachable\nStart with a benefit, end with a call to action.", additions: ["compelling", "Tone: Premium but approachable", "Start with a benefit, end with a call to action"], output: "Escape the noise and immerse yourself in studio-quality sound. Our premium wireless earbuds feature advanced noise cancellation, 8-hour battery life, and IPX5 water resistance for any adventure. Ergonomically designed for all-day comfort. Elevate your listening experience today.", issue: null, quality: 95 },
  ],
  tr: [
    { version: 1, prompt: "Bir ürün açıklaması yaz.", additions: null, output: "Bu harika bir ürün. Birçok özelliği var. Satın almalısınız.", issue: "Çok belirsiz, özel detay yok", quality: 20 },
    { version: 2, prompt: "Kablosuz kulaklıklar için bir ürün açıklaması yaz.", additions: ["Kablosuz kulaklıklar için"], output: "Bu kablosuz kulaklıklar harika ses kalitesi ve rahat kullanım sunar. Uzun pil ömrüne sahip ve birden fazla renkte mevcut.", issue: "Daha iyi, ama hala genel", quality: 45 },
    { version: 3, prompt: "Premium kablosuz kulaklıklar için 50 kelimelik bir ürün açıklaması yaz. Vurgula: gürültü engelleme, 8 saat pil, su dayanıklılığı.", additions: ["50 kelimelik", "Premium", "Vurgula: gürültü engelleme, 8 saat pil, su dayanıklılığı"], output: "Premium kablosuz kulaklıklarımızla saf ses keyfini yaşayın. Gelişmiş gürültü engelleme, dikkat dağıtıcıları engellerken kristal netliğinde ses sunar. 8 saatlik pil ömrü ve IPX5 su dayanıklılığı ile antrenman veya yolculuk için mükemmel. Ergonomik tasarım tüm gün konfor sağlar.", issue: "İyi detaylar, daha güçlü giriş gerekli", quality: 72 },
    { version: 4, prompt: "Premium kablosuz kulaklıklar için etkileyici 50 kelimelik bir ürün açıklaması yaz.\n\nAna özellikler: gürültü engelleme, 8 saat pil, IPX5 su dayanıklılığı\nTon: Premium ama ulaşılabilir\nBir fayda ile başla, harekete geçirici mesajla bitir.", additions: ["etkileyici", "Ton: Premium ama ulaşılabilir", "Bir fayda ile başla, harekete geçirici mesajla bitir"], output: "Gürültüden kaçın ve stüdyo kalitesinde sese kendinizi bırakın. Premium kablosuz kulaklıklarımız gelişmiş gürültü engelleme, 8 saatlik pil ömrü ve her macera için IPX5 su dayanıklılığı sunar. Tüm gün konfor için ergonomik tasarım. Dinleme deneyiminizi bugün yükseltin.", issue: null, quality: 95 },
  ],
};

export function IterativeRefinementDemo() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const t = useTranslations("book.interactive");
  const locale = useLocale();

  const iterations = iterationsLocale[locale] || iterationsLocale.en;

  const currentIteration = iterations[step];

  const renderPromptWithHighlights = (prompt: string, additions: string[] | null) => {
    if (!additions || additions.length === 0) return prompt;
    
    const parts: { text: string; highlighted: boolean }[] = [];
    let remaining = prompt;
    
    const sortedAdditions = [...additions].sort((a, b) => {
      const posA = prompt.indexOf(a);
      const posB = prompt.indexOf(b);
      return posA - posB;
    });
    
    for (const addition of sortedAdditions) {
      const index = remaining.indexOf(addition);
      if (index !== -1) {
        if (index > 0) {
          parts.push({ text: remaining.substring(0, index), highlighted: false });
        }
        parts.push({ text: addition, highlighted: true });
        remaining = remaining.substring(index + addition.length);
      }
    }
    if (remaining) {
      parts.push({ text: remaining, highlighted: false });
    }
    
    return parts.map((part, i) => 
      part.highlighted ? (
        <span key={i} className="bg-green-200 dark:bg-green-800/50 px-0.5 rounded">{part.text}</span>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && step < iterations.length - 1) {
      timer = setTimeout(() => setStep(s => s + 1), 2500);
    } else if (step >= iterations.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step, iterations.length]);

  const handlePlay = () => {
    if (step >= iterations.length - 1) {
      setStep(0);
    }
    setIsPlaying(true);
  };

  return (
    <div className="my-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
        <div>
          <span className="font-semibold">{t("iterativeRefinementDemo")}</span>
          <span className="text-muted-foreground text-sm ml-2">{t("watchAPromptEvolve")}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-lg transition-colors",
              isPlaying ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isPlaying ? t("playing") : step >= iterations.length - 1 ? t("replay") : t("play")}
          </button>
          <button
            onClick={() => setIsPlaying(false)}
            disabled={!isPlaying}
            className="px-3 py-1 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50"
          >
            {t("pause")}
          </button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          {iterations.map((_, i) => (
            <button
              key={i}
              onClick={() => { setStep(i); setIsPlaying(false); }}
              className={cn(
                "flex-1 h-2 rounded-full transition-all",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {t("versionXOfY", { current: currentIteration.version, total: iterations.length })}
        </div>

        <div>
          <div className="text-sm font-medium mb-1 flex items-center gap-2">
            {t("prompt")}
            <span className="text-xs px-2 py-0.5 rounded bg-muted">v{currentIteration.version}</span>
          </div>
          <pre className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-mono whitespace-pre-wrap">
            {renderPromptWithHighlights(currentIteration.prompt, currentIteration.additions)}
          </pre>
          {currentIteration.additions && (
            <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-green-200 dark:bg-green-800/50 rounded" />
              {t("newInThisVersion")}
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium mb-1">{t("output")}</div>
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            {currentIteration.output}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">{t("quality")}</div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  currentIteration.quality >= 80 ? "bg-green-500" :
                  currentIteration.quality >= 50 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${currentIteration.quality}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold w-16 text-right">
            {currentIteration.quality}%
          </div>
        </div>

        {currentIteration.issue ? (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            <span className="font-semibold">{t("issue")}</span> {currentIteration.issue}
          </div>
        ) : (
          <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
            <span className="font-semibold">{t("success")}</span> {t("successMessage")}
          </div>
        )}
      </div>
    </div>
  );
}

// Cost Calculator Component
export function CostCalculatorDemo() {
  const t = useTranslations("book.interactive");
  const [inputTokens, setInputTokens] = useState(500);
  const [outputTokens, setOutputTokens] = useState(200);
  const [requestsPerDay, setRequestsPerDay] = useState(1000);
  const [inputPrice, setInputPrice] = useState(0.15); // $ per 1M tokens
  const [outputPrice, setOutputPrice] = useState(0.60); // $ per 1M tokens

  const costPerRequest = (inputTokens * inputPrice / 1_000_000) + (outputTokens * outputPrice / 1_000_000);
  const dailyCost = costPerRequest * requestsPerDay;
  const monthlyCost = dailyCost * 30;

  const formatCurrency = (amount: number) => {
    if (amount < 0.01) return `$${amount.toFixed(4)}`;
    if (amount < 1) return `$${amount.toFixed(3)}`;
    if (amount < 100) return `$${amount.toFixed(2)}`;
    return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="my-6 p-4 border rounded-lg bg-card">
      <div className="text-sm font-medium mb-4">{t("apiCostCalculator")}</div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Input Tokens */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            {t("inputTokens")}
          </label>
          <input
            type="number"
            value={inputTokens}
            onChange={(e) => setInputTokens(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Input Price */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            {t("inputPrice")}
          </label>
          <input
            type="number"
            step="0.01"
            value={inputPrice}
            onChange={(e) => setInputPrice(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Output Tokens */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            {t("outputTokens")}
          </label>
          <input
            type="number"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Output Price */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            {t("outputPrice")}
          </label>
          <input
            type="number"
            step="0.01"
            value={outputPrice}
            onChange={(e) => setOutputPrice(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Requests per Day */}
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1.5">
            {t("requestsPerDay")}
          </label>
          <input
            type="number"
            value={requestsPerDay}
            onChange={(e) => setRequestsPerDay(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
      </div>

      {/* Results */}
      <div className="mt-4 pt-4 border-t grid gap-3 md:grid-cols-3">
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">{t("perRequest")}</div>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(costPerRequest)}
          </div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">{t("dailyCost")}</div>
          <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
            {formatCurrency(dailyCost)}
          </div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">{t("monthlyCost")}</div>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(monthlyCost)}
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground font-mono text-center">
        ({inputTokens.toLocaleString()} × ${inputPrice}/1M) + ({outputTokens.toLocaleString()} × ${outputPrice}/1M) = {formatCurrency(costPerRequest)}/request
      </div>
    </div>
  );
}
