"use client";
import { useTranslations } from "next-intl";
import { BrainCircuit, Orbit, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRunModel, RUN_MODEL_METERING, RUN_MODEL_OPTIONS, type RunModelKey } from "@/lib/run-models";
const modelIcons = { "deepseek-v4.1-flash": BrainCircuit, "gpt-6-astra": Orbit, "gpt-6.1-sol": Sparkles };
export function CompanionModelSelect({ model, onChange, disabled }: { model: RunModelKey; onChange: (model: RunModelKey) => void; disabled: boolean }) {
  const t = useTranslations("companion");
  const current = getRunModel(model)!;
  const label = t("agentQuoteModel", { model: current.label, multiplier: RUN_MODEL_METERING[model].consumptionMultiplier });
  const Icon = modelIcons[model];
  return <Select value={model} disabled={disabled} onValueChange={value => { const option = getRunModel(value); if (option) onChange(option.key); }}>
    <SelectTrigger size="sm" className="ans-companion-model-trigger" aria-label={`${t("agentModelLabel")}: ${label}`} title={label}>
      <SelectValue><Icon aria-hidden="true" /><span className="sr-only">{label}</span></SelectValue>
    </SelectTrigger>
    <SelectContent side="top" align="end" sideOffset={8} className="ans-companion-model-menu">
      <SelectGroup><SelectLabel>{t("agentModelLabel")}</SelectLabel>{RUN_MODEL_OPTIONS.map(option => {
        const OptionIcon = modelIcons[option.key];
        return <SelectItem key={option.key} value={option.key} textValue={`${option.label} · ${RUN_MODEL_METERING[option.key].consumptionMultiplier}×`}><span className="ans-companion-model-option"><OptionIcon aria-hidden="true" /><span>{option.label}</span><small>{RUN_MODEL_METERING[option.key].consumptionMultiplier}×</small></span></SelectItem>;
      })}</SelectGroup>
      <p className="ans-companion-model-note">{t("agentModelRateNote")}</p>
    </SelectContent>
  </Select>;
}
