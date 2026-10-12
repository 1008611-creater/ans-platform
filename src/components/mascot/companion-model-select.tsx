"use client";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRunModel, RUN_MODEL_METERING, RUN_MODEL_OPTIONS, type RunModelKey } from "@/lib/run-models";
export function CompanionModelSelect({ model, onChange, disabled }: { model: RunModelKey; onChange: (model: RunModelKey) => void; disabled: boolean }) {
  const t = useTranslations("companion");
  return <Select value={model} disabled={disabled} onValueChange={value => { const option = getRunModel(value); if (option) onChange(option.key); }}>
    <SelectTrigger size="sm" className="ans-companion-model-trigger" aria-label={t("agentModelLabel")}><SelectValue /></SelectTrigger>
    <SelectContent side="top" align="start" sideOffset={8} className="ans-companion-model-menu">
      <SelectGroup><SelectLabel>{t("agentModelLabel")}</SelectLabel>{RUN_MODEL_OPTIONS.map(option => <SelectItem key={option.key} value={option.key} textValue={`${option.label} · ${RUN_MODEL_METERING[option.key].consumptionMultiplier}×`}><span className="ans-companion-model-option"><span>{option.label}</span><small>{RUN_MODEL_METERING[option.key].consumptionMultiplier}×</small></span></SelectItem>)}</SelectGroup>
      <p className="ans-companion-model-note">{t("agentModelRateNote")}</p>
    </SelectContent>
  </Select>;
}
