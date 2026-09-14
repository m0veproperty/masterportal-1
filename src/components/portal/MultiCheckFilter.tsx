import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type MultiCheckOption = {
  value: string;
  label: string;
};

export function MultiCheckFilter({
  label,
  allLabel,
  options,
  selected,
  onChange,
  dark = false,
  minWidth = 160,
}: {
  label: string;
  allLabel?: string;
  options: readonly MultiCheckOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  dark?: boolean;
  minWidth?: number;
}) {
  const allSelected = selected.length === options.length;
  const selectedLabels = options.filter((option) => selected.includes(option.value));
  const summary = allSelected
    ? (allLabel ?? label)
    : selectedLabels.length === 0
      ? `No ${label.toLowerCase()}`
      : selectedLabels.length === 1
        ? selectedLabels[0].label
        : `${selectedLabels.length} selected`;

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{ minWidth }}
          className={`inline-flex h-9 items-center justify-between gap-3 rounded-lg border px-3 text-left text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
            dark
              ? "border-white/12 bg-[#131d33] text-white/85 hover:border-white/25 hover:bg-[#18243d] focus-visible:ring-cyan-300/45"
              : "border-border bg-background text-foreground hover:bg-muted/60 focus-visible:ring-ring"
          }`}
          aria-label={`${label}: ${summary}`}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-2.5">
        <div className="flex items-center justify-between gap-3 px-1 pb-1">
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <button type="button" onClick={() => onChange(options.map((option) => option.value))} className="text-info hover:underline">
              All
            </button>
            <button type="button" onClick={() => onChange([])} className="text-muted-foreground hover:text-foreground hover:underline">
              None
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                aria-pressed={checked}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[12px] font-semibold transition-colors ${
                  checked ? "bg-info/10 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${checked ? "border-info bg-info text-white" : "border-border bg-background"}`}>
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
