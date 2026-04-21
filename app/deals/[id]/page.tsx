"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { ChevronLeft, Building2, User, DollarSign, TrendingUp, Calendar, Pin, PinOff, Sparkles, Copy, Check, Mail, Phone, StickyNote, ArrowRightLeft, UserPlus, CalendarDays, Clock, Pencil, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input, { Select } from "@/components/ui/Input";
import Link from "next/link";
import { formatCurrency, formatDate, formatRelativeTime, getDealStage, getDealType, DEAL_STAGES, DEAL_TYPES, LEAD_SOURCES } from "@/lib/utils";
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
  const router = useRouter();
  const { currentUser } = useUser();
  const toast = useToast();
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", dealType: "", stage: "", value: "", probability: "",
    expectedCloseDate: "", description: "", source: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // AI Draft Email state
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftContactId, setDraftContactId] = useState("");
  const [draftTone, setDraftTone] = useState("professional");
  const [draftContext, setDraftContext] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{ subject: string; body: string } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch(`/api/deals/${id}`);
    setDeal(await res.json());
  }

  function openEditModal() {
    if (!deal) return;
    setEditForm({
      name: deal.name,
      dealType: deal.dealType,
      stage: deal.stage,
      value: deal.value?.toString() ?? "",
      probability: deal.probability?.toString() ?? "",
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split("T")[0] : "",
      description: deal.description ?? "",
      source: deal.source ?? "",
    });
    setShowEditModal(true);
  }

  async function saveEdit() {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        dealType: editForm.dealType,
        stage: editForm.stage,
        value: editForm.value ? editForm.value : null,
        probability: editForm.probability ? parseInt(editForm.probability) : undefined,
        expectedCloseDate: editForm.expectedCloseDate || null,
        description: editForm.description || null,
        source: editForm.source || null,
      }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update deal");
      return;
    }
    toast.success("Deal updated");
    setShowEditModal(false);
    load();
  }

  async function deleteDeal() {
    if (!confirm(`Delete "${deal?.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete deal");
      return;
    }
    toast.success("Deal deleted");
    router.push("/deals");
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

  async function generateDraft() {
    setDrafting(true);
    setDraftError(null);
    setDraftResult(null);
    try {
      const res = await fetch("/api/ai/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: id,
          contactId: draftContactId || undefined,
          tone: draftTone,
          context: draftContext || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) setDraftError(data.error);
      else setDraftResult(data);
    } catch {
      setDraftError("Failed to generate draft");
    }
    setDrafting(false);
  }

  function copyDraft() {
    if (!draftResult) return;
    const text = `Subject: ${draftResult.subject}\n\n${draftResult.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!deal) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );

  const stage = getDealStage(deal.stage);
  const type = getDealType(deal.dealType);
  const dealAgeDays = Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / 86_400_000);

  const activityIconMap: Record<string, React.ElementType> = {
    email: Mail, call: Phone, note: StickyNote, deal_created: TrendingUp,
    deal_stage_change: ArrowRightLeft, contact_created: UserPlus, meeting: CalendarDays,
  };
  const activityIconColor: Record<string, string> = {
    email: "text-blue-500 bg-blue-50", call: "text-green-600 bg-green-50",
    note: "text-amber-500 bg-amber-50", deal_created: "text-emerald-600 bg-emerald-50",
    deal_stage_change: "text-violet-500 bg-violet-50", contact_created: "text-indigo-500 bg-indigo-50",
    meeting: "text-rose-500 bg-rose-50",
  };

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
            <div className="flex flex-col gap-2 text-sm flex-shrink-0 items-end">
              <div className="flex items-center gap-2">
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={deleteDeal}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  onClick={() => { setDraftResult(null); setDraftError(null); setShowDraftModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Sparkles size={14} />
                  Draft Email
                </button>
              </div>
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
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Activity Timeline</h3>
              </div>
              {deal.activities.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deal.activities.map((a) => {
                    const IconComponent = activityIconMap[a.type] ?? Clock;
                    const iconColor = activityIconColor[a.type] ?? "text-slate-500 bg-slate-100";
                    return (
                      <div key={a.id} className="flex gap-4 px-5 py-3.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconColor}`}>
                          <IconComponent size={13} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{a.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{a.user?.name ? `${a.user.name} · ` : ""}{formatRelativeTime(a.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  <dd className="text-slate-700 flex items-center gap-2">
                    {formatDate(deal.createdAt)}
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${dealAgeDays >= 90 ? "bg-red-50 text-red-500" : dealAgeDays >= 60 ? "bg-amber-50 text-amber-500" : "bg-slate-100 text-slate-400"}`}>
                      {dealAgeDays}d old
                    </span>
                  </dd>
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

      {/* Edit Deal Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Deal"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={saveEdit} disabled={savingEdit || !editForm.name.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Deal Name"
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="col-span-2"
          />
          <Select
            label="Deal Type"
            value={editForm.dealType}
            onChange={(e) => setEditForm({ ...editForm, dealType: e.target.value })}
            options={DEAL_TYPES.map((t) => ({ value: t.id, label: t.label }))}
          />
          <Select
            label="Stage"
            value={editForm.stage}
            onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
            options={DEAL_STAGES.map((s) => ({ value: s.id, label: s.label }))}
          />
          <Input
            label="Deal Size ($M)"
            type="number"
            placeholder="5"
            value={editForm.value}
            onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
          />
          <Input
            label="Probability (%)"
            type="number"
            placeholder="50"
            value={editForm.probability}
            onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
          />
          <Input
            label="Expected Close Date"
            type="date"
            value={editForm.expectedCloseDate}
            onChange={(e) => setEditForm({ ...editForm, expectedCloseDate: e.target.value })}
          />
          <Select
            label="Lead Source"
            value={editForm.source}
            onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
            options={[{ value: "", label: "Select source..." }, ...LEAD_SOURCES.map((s) => ({ value: s.id, label: s.label }))]}
          />
          <Textarea
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            rows={3}
            className="col-span-2"
          />
        </div>
      </Modal>

      {/* Draft Email Modal */}
      <Modal
        open={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        title="Draft Email with AI"
        size="lg"
        footer={
          draftResult ? (
            <>
              <button onClick={() => setDraftResult(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                Regenerate
              </button>
              <button onClick={copyDraft} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Draft</>}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowDraftModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={generateDraft} disabled={drafting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                <Sparkles size={14} />
                {drafting ? "Drafting..." : "Generate Draft"}
              </button>
            </>
          )
        }
      >
        {draftResult ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subject</p>
              <p className="text-sm font-medium text-slate-900 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                {draftResult.subject}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Body</p>
              <div className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-3 border border-slate-200 whitespace-pre-wrap leading-relaxed">
                {draftResult.body}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              AI will draft a follow-up email based on this deal's stage, notes, and contact history.
            </p>
            {deal.contacts.length > 0 && (
              <Select
                label="Recipient"
                value={draftContactId}
                onChange={(e) => setDraftContactId(e.target.value)}
                options={[
                  { value: "", label: "First contact (default)" },
                  ...deal.contacts.map((dc) => ({
                    value: dc.contact.id,
                    label: `${dc.contact.firstName} ${dc.contact.lastName}${dc.role ? ` (${dc.role})` : ""}`,
                  })),
                ]}
              />
            )}
            <Select
              label="Tone"
              value={draftTone}
              onChange={(e) => setDraftTone(e.target.value)}
              options={[
                { value: "professional", label: "Professional" },
                { value: "warm and direct", label: "Warm & Direct" },
                { value: "formal", label: "Formal" },
                { value: "concise", label: "Concise" },
              ]}
            />
            <Input
              label="Additional Context (optional)"
              placeholder="e.g. Follow up on LOI, ask about exclusivity period..."
              value={draftContext}
              onChange={(e) => setDraftContext(e.target.value)}
            />
            {draftError && <p className="text-sm text-red-500">{draftError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
