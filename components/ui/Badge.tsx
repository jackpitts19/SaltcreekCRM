import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: "default" | "outline" | "soft";
  size?: "sm" | "md";
  className?: string;
}

const variantMap: Record<string, string> = {
  prospecting: "bg-slate-100 text-slate-700",
  initial_contact: "bg-amber-100 text-amber-700",
  pitch: "bg-purple-100 text-purple-700",
  diligence: "bg-blue-100 text-blue-700",
  loi: "bg-cyan-100 text-cyan-700",
  negotiation: "bg-orange-100 text-orange-700",
  closing: "bg-emerald-100 text-emerald-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-700",
  prospect: "bg-slate-100 text-slate-700",
  client: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-100 text-gray-500",
  sent: "bg-slate-100 text-slate-700",
  delivered: "bg-blue-100 text-blue-700",
  opened: "bg-green-100 text-green-700",
  replied: "bg-emerald-100 text-emerald-700",
  bounced: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
  no_answer: "bg-slate-100 text-slate-600",
  voicemail: "bg-purple-100 text-purple-700",
};

export default function Badge({ children, color, variant = "default", size = "sm", className }: BadgeProps) {
  const key = typeof children === "string" ? children.toLowerCase().replace(" ", "_") : "";
  const autoStyle = variantMap[key];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        autoStyle ?? "bg-slate-100 text-slate-700",
        className
      )}
      style={color ? { backgroundColor: color + "20", color } : undefined}
    >
      {children}
    </span>
  );
}
