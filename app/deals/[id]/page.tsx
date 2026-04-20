"use client";

import { useState, useEffect, use } from "react";
import TopBar from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { ChevronLeft, Building2, User, DollarSign, TrendingUp, Calendar, Pin, PinOff } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, formatRelativeTime, getDealStage, getDealType, DEAL_STAGES } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/lib/toast";

interface DealDetail {
  id: string; name: string; dealType: string; stage: string;
  value: number | null; probability: number;
  expectedCloseDate: string | null; actualCloseDate: string | null;
  description: string | null; lostReason: string | null; source: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  contacts: Array<{
    role: string | null;
    contact: { id: string; firstName: string; lastName: string; title: string | null; email: string | null };
  }>;
  notes: Array<{ id: string; content: string; isPinned: boolean; createdAt: string; author: { name: string } | null }>;
  activities: Array<{ id: string; type: string; description: string; createdAt: string; user: { name: string } | null }>;
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser } = useUser();
  const toast = useToast();
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function load() {
    const res = await fetch(`/api/deals/${id}`);
    setDeal(await res.json());
  }

  useEffect(() => { load(); }, [id]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, dealId: id, authorId: currentUser?.id ?? null }),
    });
    setNoteText("");
    setAddingNote(false);
    toast.success("Note saved");
    load();
  }

  async function changeStage(newStage: string) {
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    load();
  }

  async function togglePin(noteId: string, isPinned: boolean) {
    await fetch(`/api/notes?id=${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !isPinned }),
    });
    load();
  }

  if (!deal) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );

  const stage = getDealStage(deal.stage);
  const type = getDealType(deal.dealType);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title={deal.name} subtitle={`${type.label} · ${deal.company?.name ?? "No company"}`} />

      <div className="p-6 space-y-5">
        <Link href="/deals" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 w-fit">
          <ChevronLeft size={14} /> Back to Pipeline
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{deal.name}</h1>
                <span className="text-sm px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: stage.color + "20", color: stage.color }}>
                  {stage.label}
                </span>
              </div>
              <p className="text-slate-500 mt-0.5">{type.label}</p>
              {deal.description && <p className="text-sm text-slate-600 mt-2">{deal.description}</p>}
            </div>
            <div className="flex flex-col gap-2 text-sm flex-shrink-0">
              {deal.company && (
                <Link href={`/companies/${deal.company.id}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
                  <Building2 size={14} className="text-slate-400" /> {deal.company.name}
                </Link>
              )}
              {deal.value && (
                <p className="flex items-center gap-2 text-slate-700 font-bold text-lg">
                  <DollarSign size={14} className="text-slate-400" /> {formatCurrency(deal.value)}
                </p>
              )}
              {deal.expectedCloseDate && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Calendar size={14} className="text-slate-400" /> Close: {formatDate(deal.expectedCloseDate)}
                </p>
              )}
              {deal.assignedTo && (
                <p className="flex items-center gap-2 text-slate-600">
                  <User size={14} className="text-slate-400" /> {deal.assignedTo.name}
                </p>
              )}
            </div>
          </div>

          {/* Stage Progress Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Stage</p>
            <div className="flex gap-1">
              {DEAL_STAGES.filter((s) => !["closed_won", "closed_lost"].includes(s.id)).map((s, i) => {
                const currentIdx = DEAL_STAGES.findIndex((x) => x.id === deal.stage);
                const thisIdx = DEAL_STAGES.findIndex((x) => x.id === s.id);
                const isActive = s.id === deal.stage;
                const isPast = thisIdx < currentIdx;
                return (
                  <button key={s.id} onClick={() => changeStage(s.id)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                      isActive ? "text-white shadow-sm" : isPast ? "opacity-60" : "opacity-30 hover:opacity-50"
                    }`}
                    style={{
                      backgroundColor: isActive ? s.color : isPast ? s.color + "60" : "#e2e8f0",
                      color: isActive || isPast ? "white" : "#64748b",
                    }}
                    title={s.label}>
                    {s.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Notes */}
            <Card>
              <CardHeader title="Notes" />
              <div className="mb-4">
                <Textarea placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} className="mb-2" />
                <button onClick={addNote} disabled={addingNote || !noteText.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {addingNote ? "Saving..." : "Add Note"}
                </button>
              </div>
              <div className="space-y-3">
                {deal.notes.map((note) => (
                  <div key={note.id} className={`p-3 rounded-lg border text-sm ${note.isPinned ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-slate-700 leading-relaxed flex-1">{note.content}</p>
                      <button onClick={() => togglePin(note.id, note.isPinned)} className="text-slate-400 hover:text-amber-500 flex-shrink-0">
                        {note.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{note.author?.name ?? "You"} · {formatRelativeTime(note.createdAt)}</p>
                  </div>
                ))}
                {deal.notes.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No notes yet</p>}
              </div>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader title="Activity Timeline" />
              <div className="space-y-1">
                {deal.activities.map((a) => (
                  <div key={a.id} className="flex gap-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{a.description}</p>
                      <p className="text-xs text-slate-400">{a.user?.name ? `${a.user.name} · ` : ""}{formatRelativeTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {deal.activities.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No activity yet</p>}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Key Metrics */}
            <Card>
              <CardHeader title="Deal Info" />
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Deal Type</dt>
                  <dd className="text-slate-700">{type.label}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Probability</dt>
                  <dd className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${deal.probability}%` }} />
                    </div>
                    <span className="text-slate-700 font-medium">{deal.probability}%</span>
                  </dd>
                </div>
                {deal.expectedCloseDate && (
                  <div>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Expected Close</dt>
                    <dd className="text-slate-700">{formatDate(deal.expectedCloseDate)}</dd>
                  </div>
                )}
                {deal.source && (
                  <div>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Source</dt>
                    <dd className="text-slate-700">{deal.source}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Created</dt>
                  <dd className="text-slate-700">{formatDate(deal.createdAt)}</dd>
                </div>
              </dl>
            </Card>

            {/* Contacts */}
            <Card padding={false}>
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-sm">Contacts ({deal.contacts.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {deal.contacts.map((dc) => (
                  <Link key={dc.contact.id} href={`/contacts/${dc.contact.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-blue-700">
                        {dc.contact.firstName[0]}{dc.contact.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{dc.contact.firstName} {dc.contact.lastName}</p>
                      <p className="text-xs text-slate-500">{dc.role ?? dc.contact.title ?? "—"}</p>
                    </div>
                  </Link>
                ))}
                {deal.contacts.length === 0 && (
                  <div className="py-4 text-center text-slate-400 text-sm">No contacts linked</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
