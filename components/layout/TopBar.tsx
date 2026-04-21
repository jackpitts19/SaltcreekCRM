"use client";

import { Search, Plus, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import CommandPalette from "@/components/ui/CommandPalette";
import { useMobileSidebar } from "@/lib/mobileSidebar";
import NotificationBell from "@/components/ui/NotificationBell";

interface TopBarProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function TopBar({ title, subtitle, action }: TopBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { setOpen } = useMobileSidebar();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Search — opens command palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 pl-3 pr-2 py-1.5 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-lg w-56 hover:border-slate-300 transition-colors"
          >
            <Search size={14} className="flex-shrink-0" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-xs font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">⌘K</kbd>
          </button>

          <NotificationBell />

          {action && (
            <button
              onClick={action.onClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              {action.label}
            </button>
          )}
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
