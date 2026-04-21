"use client";

import { useState } from "react";
import { Search, Sparkles, TrendingUp, CheckSquare, Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const SHORTCUTS = [
  { label: "Prep for next meeting", icon: Sparkles, query: "prep for next meeting" },
  { label: "My open deals", icon: TrendingUp, href: "/deals" },
  { label: "Pending tasks", icon: CheckSquare, href: "/tasks" },
  { label: "Find a contact", icon: Users, href: "/contacts" },
];

export default function AiChatBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/home/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResult(data.answer);
    } catch {
      setResult("Sorry, something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleShortcut(s: (typeof SHORTCUTS)[0]) {
    if (s.href) {
      router.push(s.href);
    } else if (s.query) {
      setQuery(s.query);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <Search size={17} className="text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Ask anything about your pipeline, contacts, or tasks..."
          className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ArrowRight size={12} /> Ask
              </>
            )}
          </button>
        )}
      </form>

      {/* Shortcuts */}
      {!result && !loading && (
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {SHORTCUTS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleShortcut(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-600 font-medium transition-colors"
            >
              <s.icon size={12} className="text-slate-500" />
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Result */}
      {(result || loading) && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
              Searching your CRM...
            </div>
          ) : (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result}</div>
          )}
          {result && (
            <button
              onClick={() => { setResult(null); setQuery(""); }}
              className="mt-3 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
