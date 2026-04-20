"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Input";
import { StickyNote, Pin, Trash2, Search, Building2, Users, TrendingUp } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useUser } from "@/lib/userContext";

interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  contact?: { id: string; firstName: string; lastName: string };
  company?: { id: string; name: string };
  deal?: { id: string; name: string };
  author?: { name: string };
}

interface Option { id: string; name?: string; firstName?: string; lastName?: string; }

export default function NotesPage() {
  const { currentUser } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contacts, setContacts] = useState<Option[]>([]);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [deals, setDeals] = useState<Option[]>([]);

  const [form, setForm] = useState({ content: "", contactId: "", companyId: "", dealId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notes");
    setNotes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showModal) {
      Promise.all([
        fetch("/api/contacts").then(r => r.json()),
        fetch("/api/companies").then(r => r.json()),
        fetch("/api/deals").then(r => r.json()),
      ]).then(([c, co, d]) => {
        setContacts(c);
        setCompanies(co);
        setDeals(d);
      });
    }
  }, [showModal]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: form.content,
        contactId: form.contactId || undefined,
        companyId: form.companyId || undefined,
        dealId: form.dealId || undefined,
        authorId: currentUser?.id ?? null,
      }),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ content: "", contactId: "", companyId: "", dealId: "" });
    load();
  }

  async function togglePin(note: Note) {
    await fetch(`/api/notes?id=${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !note.isPinned }),
    });
    load();
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    load();
  }

  const contactName = (c: Option) => `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return n.content.toLowerCase().includes(q) ||
      (n.contact && contactName(n.contact).toLowerCase().includes(q)) ||
      n.company?.name.toLowerCase().includes(q) ||
      n.deal?.name.toLowerCase().includes(q);
  });

  const pinned = filtered.filter(n => n.isPinned);
  const unpinned = filtered.filter(n => !n.isPinned);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Notes" subtitle="Logged notes across contacts, companies, and deals"
        action={{ label: "New Note", onClick: () => setShowModal(true) }} />

      <div className="p-6">
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <StickyNote size={40} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No notes yet</p>
            <p className="text-slate-400 text-sm mt-1">Add notes to contacts, companies, and deals</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Add your first note
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Pin size={12} /> Pinned
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pinned.map(note => <NoteCard key={note.id} note={note} onPin={togglePin} onDelete={deleteNote} contactName={contactName} />)}
                </div>
              </div>
            )}
            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">All Notes</h2>}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unpinned.map(note => <NoteCard key={note.id} note={note} onPin={togglePin} onDelete={deleteNote} contactName={contactName} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Note" size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.content.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Save Note"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Textarea label="Note" required value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            rows={5} placeholder="Write your note here..." />
          <Select label="Link to Contact (optional)" value={form.contactId}
            onChange={e => setForm({ ...form, contactId: e.target.value })}
            options={[{ value: "", label: "None" }, ...contacts.map(c => ({ value: c.id!, label: contactName(c) }))]} />
          <Select label="Link to Company (optional)" value={form.companyId}
            onChange={e => setForm({ ...form, companyId: e.target.value })}
            options={[{ value: "", label: "None" }, ...companies.map(c => ({ value: c.id!, label: c.name! }))]} />
          <Select label="Link to Deal (optional)" value={form.dealId}
            onChange={e => setForm({ ...form, dealId: e.target.value })}
            options={[{ value: "", label: "None" }, ...deals.map(d => ({ value: d.id!, label: d.name! }))]} />
        </form>
      </Modal>
    </div>
  );
}

function NoteCard({ note, onPin, onDelete, contactName }: {
  note: Note;
  onPin: (n: Note) => void;
  onDelete: (id: string) => void;
  contactName: (c: any) => string;
}) {
  return (
    <div className={`bg-white rounded-xl border-2 p-4 flex flex-col gap-3 transition-colors ${note.isPinned ? "border-yellow-200" : "border-slate-200"}`}>
      <p className="text-sm text-slate-700 leading-relaxed flex-1 whitespace-pre-wrap">{note.content}</p>

      {(note.contact || note.company || note.deal) && (
        <div className="flex flex-wrap gap-1.5">
          {note.contact && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              <Users size={10} /> {contactName(note.contact)}
            </span>
          )}
          {note.company && (
            <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
              <Building2 size={10} /> {note.company.name}
            </span>
          )}
          {note.deal && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              <TrendingUp size={10} /> {note.deal.name}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-400">{formatRelativeTime(note.createdAt)}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onPin(note)}
            className={`p-1.5 rounded-lg transition-colors ${note.isPinned ? "text-yellow-500 hover:bg-yellow-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}>
            <Pin size={13} />
          </button>
          <button onClick={() => onDelete(note.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
