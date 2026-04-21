import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, suffix = "M"): string {
  if (value == null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}${suffix}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const DEAL_STAGES = [
  { id: "prospect",    label: "Prospect",    color: "#64748b" },
  { id: "outreach",    label: "Outreach",    color: "#f59e0b" },
  { id: "intro_call",  label: "Intro Call",  color: "#8b5cf6" },
  { id: "nda",         label: "NDA Signed",  color: "#3b82f6" },
  { id: "cim",         label: "CIM Sent",    color: "#06b6d4" },
  { id: "ioi",         label: "IOI",         color: "#f97316" },
  { id: "loi",         label: "LOI",         color: "#10b981" },
  { id: "diligence",   label: "Diligence",   color: "#0ea5e9" },
  { id: "closing",     label: "Closing",     color: "#84cc16" },
  { id: "closed_won",  label: "Closed Won",  color: "#22c55e" },
  { id: "closed_lost", label: "Closed Lost", color: "#ef4444" },
];

export const DEAL_TYPES = [
  { id: "ma_sellside", label: "M&A Sell-side" },
  { id: "ma_buyside", label: "M&A Buy-side" },
];

export const LEAD_SOURCES = [
  { id: "referral", label: "Referral" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "cold_outreach", label: "Cold Outreach" },
  { id: "conference", label: "Conference" },
  { id: "inbound", label: "Inbound" },
  { id: "existing_client", label: "Existing Client" },
];

export function getDealStage(id: string) {
  return DEAL_STAGES.find((s) => s.id === id) ?? { id, label: id, color: "#64748b" };
}

export function getDealType(id: string) {
  return DEAL_TYPES.find((t) => t.id === id) ?? { id, label: id };
}

export function probabilityColor(p: number): string {
  if (p >= 80) return "text-green-600";
  if (p >= 50) return "text-blue-600";
  if (p >= 30) return "text-yellow-600";
  return "text-red-600";
}
