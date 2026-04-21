"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Building2, TrendingUp, FileText, Phone, Mail, ArrowRight, UserPlus, CheckSquare, PhoneForwarded, Mic, Zap } from "lucide-react";

interface Result {
  id: string;
  type: "contact" | "company" | "deal";
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICON: Record<Result["type"], React.ReactNode> = {
  contact: <Users size={14} className="text-blue-500" />,
  company: <Building2 size={14} className="text-indigo-500" />,
  deal: <TrendingUp size={14} className="text-emerald-500" />,
};

const QUICK_ACTIONS = [
  { label: "New Contact", href: "/contacts/new", icon: <UserPlus size={14} className="text-blue-500" />, hint: "Add a contact" },
  { label: "Start Power Dialing", href: "/calls/dialer", icon: <PhoneForwarded size={14} className="text-green-600" />, hint: "Power dialer" },
  { label: "Record a Meeting", href: "/meetings/record", icon: <Mic size={14} className="text-violet-500" />, hint: "AI transcription" },
  { label: "New Task", href: "/tasks?new=1", icon: <CheckSquare size={14} className="text-amber-500" />, hint: "Create a task" },
];

const QUICK_NAV = [
  { label: "Contacts", href: "/contacts", icon: <Users size={14} className="text-slate-500" /> },
  { label: "Companies", href: "/companies", icon: <Building2 size={14} className="text-slate-500" /> },
  { label: "Pipeline", href: "/deals", icon: <TrendingUp size={14} className="text-slate-500" /> },
  { label: "Emails", href: "/emails", icon: <Mail size={14} className="text-slate-500" /> },
  { label: "Calls", href: "/calls", icon: <Phone size={14} className="text-slate-500" /> },
  { label: "Notes", href: "/notes", icon: <FileText size={14} className="text-slate-500" /> },
  { label: "Sequences", href: "/sequences", icon: <Zap size={14} className="text-slate-500" /> },
];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const [contacts, companies, deals] = await Promise.all([
        fetch(`/api/contacts?search=${encodeURIComponent(q)}&take=4`).then((r) => r.json()),
        fetch(`/api/companies?search=${encodeURIComponent(q)}&take=4`).then((r) => r.json()),
        fetch(`/api/deals?search=${encodeURIComponent(q)}&take=4`).then((r) => r.json()),
      ]);
      const items: Result[] = [
        ...contacts.slice(0, 4).map((c: any) => ({
          id: c.id, type: "contact" as const,
          title: `${c.firstName} ${c.lastName}`,
          subtitle: [c.title, c.company?.name].filter(Boolean).join(" at "),
          href: `/contacts/${c.id}`,
        })),
        ...companies.slice(0, 4).map((c: any) => ({
          id: c.id, type: "company" as const,
          title: c.name,
          subtitle: [c.industry, c.hqLocation].filter(Boolean).join(" · "),
          href: `/companies/${c.id}`,
        })),
        ...deals.slice(0, 4).map((d: any) => ({
          id: d.id, type: "deal" as const,
          title: d.name,
          subtitle: d.stage,
          href: `/deals/${d.id}`,
        })),
      ];
      setResults(items);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const allItems = query ? results : [];
  const totalItems = query ? allItems.length : QUICK_ACTIONS.length + QUICK_NAV.length;

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, totalItems - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!query) {
        if (selected < QUICK_ACTIONS.length) navigate(QUICK_ACTIONS[selected].href);
        else navigate(QUICK_NAV[selected - QUICK_ACTIONS.length]?.href);
        return;
      }
      if (allItems[selected]) navigate(allItems[selected].href);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKey}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts, companies, deals..."
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none"
          />
          {loading && <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <kbd className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono flex-shrink-0">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query && (
            <div className="p-2 space-y-3">
              <div>
                <p className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Quick Actions</p>
                {QUICK_ACTIONS.map((item, i) => (
                  <button key={item.href} onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      selected === i ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}>
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className={`font-medium ${selected === i ? "text-blue-700" : "text-slate-800"}`}>{item.label}</span>
                    <span className="text-xs text-slate-400 ml-auto">{item.hint}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-2">
                <p className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Navigate</p>
                <div className="grid grid-cols-2 gap-0.5">
                  {QUICK_NAV.map((link, i) => {
                    const idx = QUICK_ACTIONS.length + i;
                    return (
                      <button key={link.href} onClick={() => navigate(link.href)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selected === idx ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                        }`}>
                        {link.icon}
                        {link.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {query && results.length === 0 && !loading && (
            <div className="py-10 text-center text-slate-400 text-sm">No results for "{query}"</div>
          )}

          {query && results.length > 0 && (
            <div className="p-2">
              {results.map((item, i) => (
                <button key={item.id} onClick={() => navigate(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selected === i ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}>
                  <span className="flex-shrink-0">{TYPE_ICON[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selected === i ? "text-blue-700" : "text-slate-900"}`}>{item.title}</p>
                    {item.subtitle && <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 capitalize">{item.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="font-mono bg-slate-100 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-slate-100 px-1 rounded">↵</kbd> open</span>
          <span><kbd className="font-mono bg-slate-100 px-1 rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
