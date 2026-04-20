"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  Mail,
  Phone,
  StickyNote,
  Zap,
  Settings,
  ChevronRight,
  BarChart3,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, initials } from "@/lib/userContext";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/companies", icon: Building2, label: "Companies" },
  { href: "/deals", icon: TrendingUp, label: "Pipeline" },
  { href: "/emails", icon: Mail, label: "Emails" },
  { href: "/calls", icon: Phone, label: "Calls" },
  { href: "/sequences", icon: Zap, label: "Sequences" },
  { href: "/notes", icon: StickyNote, label: "Notes" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, users, setCurrentUser } = useUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <aside
      className="fixed inset-y-0 left-0 w-56 flex flex-col z-30"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-7 h-7 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold tracking-tight">SC</span>
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight tracking-tight">Salt Creek</p>
          <p className="text-slate-400 text-xs">Advisory</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                    active
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")}
                  />
                  <span className="font-medium">{label}</span>
                  {active && <ChevronRight size={12} className="ml-auto text-blue-400" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User switcher */}
      <div className="p-3 border-t border-white/5 relative">
        <button
          onClick={() => setSwitcherOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">
              {currentUser ? initials(currentUser.name) : "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-xs font-medium truncate">
              {currentUser?.name ?? "Loading…"}
            </p>
            <p className="text-slate-500 text-xs truncate">
              {currentUser?.title ?? currentUser?.role ?? ""}
            </p>
          </div>
          <ChevronDown
            size={12}
            className={cn("text-slate-500 transition-transform flex-shrink-0", switcherOpen && "rotate-180")}
          />
        </button>

        {/* Dropdown */}
        {switcherOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-white/10 overflow-hidden shadow-xl"
            style={{ background: "var(--sidebar-bg)" }}>
            <p className="px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider border-b border-white/5">
              Switch user
            </p>
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => { setCurrentUser(u); setSwitcherOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">{initials(u.name)}</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-slate-200 text-xs font-medium truncate">{u.name}</p>
                  <p className="text-slate-500 text-xs truncate">{u.title ?? u.role}</p>
                </div>
                {currentUser?.id === u.id && (
                  <Check size={12} className="text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
