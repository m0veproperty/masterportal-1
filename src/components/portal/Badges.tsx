import type { ReactNode } from "react";

const bands: Record<string, string> = {
  green: "band-green",
  amber: "band-amber",
  orange: "band-orange",
  red: "band-red",
  grey: "band-grey",
  blue: "band-blue",
};

export function Band({ tone, children }: { tone: keyof typeof bands; children: ReactNode }) {
  return <span className={`${bands[tone] ?? "band-grey"} px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1`}>{children}</span>;
}

const healthTone: Record<string, keyof typeof bands> = {
  healthy: "green",
  mostly_healthy: "blue",
  needs_attention: "orange",
  high_risk: "red",
  incomplete: "grey",
};
export function HealthBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Band tone={healthTone[status] ?? "grey"}>{label}</Band>;
}

const importanceTone: Record<string, keyof typeof bands> = {
  very_high: "red",
  high: "orange",
  medium: "blue",
  low: "grey",
};
export function ImportanceBadge({ level }: { level: string }) {
  const label = level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Band tone={importanceTone[level] ?? "grey"}>{label}</Band>;
}

export function categoryLabel(c: string) {
  return {
    adsense_other: "AdSense",
    affiliate: "Affiliate",
    dropship: "Dropship",
    pbn: "PBN",
    portfolio: "Portfolio",
    client: "Client",
    portfolio_client: "Portfolio / Client",
    premium: "Premium",
    other: "Other",
  }[c] ?? c;
}
