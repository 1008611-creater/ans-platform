"use client";
import { useTranslations } from "next-intl";
import { BrainCircuit, Orbit, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAvailableRunModel, getRunModel, RUN_MODEL_OPTIONS, type RunModelKey } from "@/lib/run-models";
import { usePausedRunModels, useRunModelMultipliers } from "@/components/providers/run-model-pricing";
const modelIcons = { "deepseek-v4.1-flash": BrainCircuit, "gpt-6-astra": Orbit, "gpt-6.1-sol": Sparkles };
export function CompanionModelSelect({ model, onChange, disabled }: { model: RunModelKey; onChange: (model: RunModelKey) => void; disabled: boolean }) {
  const t = useTranslations("companion");
  const multipliers = useRunModelMultipliers();
  const paused = usePausedRunModels();
  const current = getRunModel(model)!;
  const rate = multipliers[model];
  const label = rate === undefined ? current.label : t("agentQuoteModel", { model: current.label, multiplier: rate });
  const Icon = modelIcons[model];
  return <Select value={model} disabled={disabled} onValueChange={value => { const option = getAvailableRunModel(value, paused); if (option) onChange(option.key); }}>
    <SelectTrigger size="sm" className="ans-companion-model-trigger" aria-label={`${t("agentModelLabel")}: ${label}`} title={label}>
      <SelectValue><Icon aria-hidden="true" /><span className="sr-only">{label}</span></SelectValue>
    </SelectTrigger>
    <SelectContent side="top" align="end" sideOffset={8} className="ans-companion-model-menu">
      <SelectGroup><SelectLabel>{t("agentModelLabel")}</SelectLabel>{RUN_MODEL_OPTIONS.map(option => {
        const OptionIcon = modelIcons[option.key];
        const optionRate = multipliers[option.key];
        const unavailable = paused.includes(option.key);
        const note = unavailable ? t("agentModelUnavailable") : optionRate === undefined ? null : `${optionRate}×`;
        return <SelectItem key={option.key} value={option.key} disabled={unavailable} textValue={note ? `${option.label} · ${note}` : option.label}><span className="ans-companion-model-option"><OptionIcon aria-hidden="true" /><span>{option.label}</span>{note && <small>{note}</small>}</span></SelectItem>;
      })}</SelectGroup>
      <p className="ans-companion-model-note">{t("agentModelRateNote")}</p>
    </SelectContent>
  </Select>;
}
