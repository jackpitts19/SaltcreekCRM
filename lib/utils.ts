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
  { id: "prospecting", label: "Prospecting", color: "#64748b" },
  { id: "initial_contact", label: "Initial Contact", color: "#f59e0b" },
  { id: "pitch", label: "Pitch", color: "#8b5cf6" },
  { id: "diligence", label: "Diligence", color: "#3b82f6" },
  { id: "loi", label: "LOI / Term Sheet", color: "#06b6d4" },
  { id: "negotiation", label: "Negotiation", color: "#f97316" },
  { id: "closing", label: "Closing", color: "#10b981" },
  { id: "closed_won", label: "Closed Won", color: "#22c55e" },
  { id: "closed_lost", label: "Closed Lost", color: "#ef4444" },
];

export const DEAL_TYPES = [
  { id: "ma_buyside", label: "M&A Buy-side" },
  { id: "ma_sellside", label: "M&A Sell-side" },
  { id: "ipo", label: "IPO" },
  { id: "debt", label: "Debt Financing" },
  { id: "equity", label: "Equity Financing" },
  { id: "advisory", label: "Advisory" },
  { id: "restructuring", label: "Restructuring" },
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
