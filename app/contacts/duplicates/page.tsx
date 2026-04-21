"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { Users, Merge, ChevronDown, ChevronUp, Check } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/lib/toast";

interface DupContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  company: { id: string; name: string } | null;
  _count: { notes: number; emailLogs: number; callLogs: number };
  createdAt: string;
}

interface DupGroup {
  contacts: DupContact[];
}

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<DupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [merging, setMerging] = useState<string | null>(null);
  // per-group: which contact is the "keep" target
  const [targets, setTargets] = useState<Record<number, string>>({});
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/contacts/duplicates");
    const data = await res.json();
    setGroups(data);
    // default target = first contact in each group
    const defaults: Record<number, string> = {};
    data.forEach((g: DupGroup, i: number) => { if (g.contacts[0]) defaults[i] = g.contacts[0].id; });
    setTargets(defaults);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function handleMerge(groupIdx: number, sourceId: string) {
    const targetId = targets[groupIdx];
    if (!targetId || targetId === sourceId) return;
    setMerging(sourceId);
    const res = await fetch("/api/contacts/duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, sourceId }),
    });
    const result = await res.json();
    setMerging(null);
    if (!res.ok) {
      toast.error(result.error ?? "Merge failed");
    } else {
      toast.success("Contacts merged");
      load();
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Duplicate Contacts"
        subtitle={loading ? "Scanning..." : `${groups.length} duplicate group${groups.length !== 1 ? "s" : ""} found`}
        action={{ label: "← Back to Contacts", onClick: () => window.history.back() }}
      />

      <div className="p-6 max-w-4xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Scanning for duplicates...</div>
        ) : groups.length === 0 ? (
          <div className="py-20 text-center">
            <Check size={36} className="text-green-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No duplicates found</p>
            <p className="text-slate-400 text-sm mt-1">Your contact list looks clean!</p>
            <Link href="/contacts" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
              Back to contacts
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, i) => {
              const isOpen = expanded.has(i);
              const target = targets[i];
              return (
                <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleExpand(i)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Users size={14} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {group.contacts[0].firstName} {group.contacts[0].lastName}
                        <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {group.contacts.length} duplicates
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {group.contacts.map(c => c.email).filter(Boolean).join(" · ") || "No email"}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>

                  {/* Expanded contacts */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs text-slate-500 font-medium">
                          Select which record to keep (target), then merge duplicates into it.
                        </p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {group.contacts.map((c) => {
                          const isTarget = target === c.id;
                          return (
                            <div key={c.id} className={`px-5 py-3 flex items-start gap-3 ${isTarget ? "bg-blue-50" : ""}`}>
                              {/* Keep radio */}
                              <button
                                onClick={() => setTargets((prev) => ({ ...prev, [i]: c.id }))}
                                className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${isTarget ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}
                                title="Keep this record"
                              >
                                {isTarget && <span className="block w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link href={`/contacts/${c.id}`} className="font-medium text-slate-900 hover:text-blue-600 text-sm">
                                    {c.firstName} {c.lastName}
                                  </Link>
                                  {isTarget && (
                                    <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded font-medium">Keep</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                                  {c.email && <p>{c.email}</p>}
                                  {c.phone && <p>{c.phone}</p>}
                                  {c.title && <p>{c.title}</p>}
                                  {c.company && <p>{c.company.name}</p>}
                                  <p className="text-slate-400">
                                    {c._count.emailLogs} emails · {c._count.callLogs} calls · {c._count.notes} notes ·
                                    created {new Date(c.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              {!isTarget && (
                                <button
                                  onClick={() => handleMerge(i, c.id)}
                                  disabled={merging === c.id}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 flex-shrink-0"
                                >
                                  <Merge size={11} />
                                  {merging === c.id ? "Merging..." : "Merge into kept"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
