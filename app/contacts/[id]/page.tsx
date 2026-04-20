"use client";

import { useState, useEffect, use } from "react";
import TopBar from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import {
  Mail, Phone, Building2, Linkedin, Clock, ExternalLink,
  Pin, PinOff, ChevronLeft, TrendingUp, Edit2
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, formatDate, formatDuration, getDealStage, getDealType } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/lib/toast";

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  linkedinUrl: string | null;
  status: string;
  tags: string;
  lastContactedAt: string | null;
  createdAt: string;
  company: {
    id: string; name: string; industry: string | null; hqLocation: string | null;
  } | null;
  notes: Array<{
    id: string; content: string; isPinned: boolean; createdAt: string;
    author: { name: string } | null;
  }>;
  emailLogs: Array<{
    id: string; subject: string; direction: string; status: string; fromEmail: string; toEmail: string; sentAt: string;
  }>;
  callLogs: Array<{
    id: string; direction: string; status: string; duration: number | null; notes: string | null; calledAt: string;
  }>;
  dealContacts: Array<{
    role: string | null;
    deal: { id: string; name: string; stage: string; dealType: string; value: number | null; company: { name: string } | null };
  }>;
  activities: Array<{
    id: string; type: string; description: string; createdAt: string;
  }>;
  sequenceEnrollments: Array<{
    id: string; status: string; currentStep: number; enrolledAt: string;
    sequence: { id: string; name: string };
  }>;
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser } = useUser();
  const toast = useToast();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "emails" | "calls" | "deals" | "sequences">("overview");
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function load() {
    const res = await fetch(`/api/contacts/${id}`);
    const data = await res.json();
    setContact(data);
  }

  useEffect(() => { load(); }, [id]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, contactId: id, authorId: currentUser?.id ?? null }),
    });
    setNoteText("");
    setAddingNote(false);
    toast.success("Note saved");
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

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "emails", label: `Emails (${contact.emailLogs.length})` },
    { id: "calls", label: `Calls (${contact.callLogs.length})` },
    { id: "deals", label: `Deals (${contact.dealContacts.length})` },
    { id: "sequences", label: `Sequences (${contact.sequenceEnrollments.length})` },
  ] as const;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title={`${contact.firstName} ${contact.lastName}`}
        subtitle={[contact.title, contact.company?.name].filter(Boolean).join(" at ")}
      />

      <div className="p-6 space-y-5">
        {/* Back + Header Card */}
        <Link href="/contacts" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 w-fit">
          <ChevronLeft size={14} /> Back to Contacts
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-blue-700">
                {contact.firstName[0]}{contact.lastName[0]}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  {contact.firstName} {contact.lastName}
                </h1>
                <Badge>{contact.status}</Badge>
              </div>
              {contact.title && <p className="text-slate-600 mt-0.5">{contact.title}</p>}
              {contact.company && (
                <Link href={`/companies/${contact.company.id}`} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 text-sm mt-1 w-fit">
                  <Building2 size={13} />
                  {contact.company.name}
                  {contact.company.industry && ` · ${contact.company.industry}`}
                </Link>
              )}
              {contact.tags && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {contact.tags.split(",").filter(Boolean).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm flex-shrink-0">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
                  <Mail size={14} className="text-slate-400" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-green-600">
                  <Phone size={14} className="text-slate-400" /> {contact.phone}
                </a>
              )}
              {contact.linkedinUrl && (
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-700">
                  <Linkedin size={14} className="text-slate-400" /> LinkedIn
                  <ExternalLink size={11} />
                </a>
              )}
              <p className="flex items-center gap-2 text-slate-400">
                <Clock size={13} /> Last contact: {formatRelativeTime(contact.lastContactedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Notes */}
              <Card>
                <CardHeader title="Notes" />
                <div className="mb-4">
                  <Textarea
                    placeholder="Add a note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    className="mb-2"
                  />
                  <button onClick={addNote} disabled={addingNote || !noteText.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                    {addingNote ? "Saving..." : "Add Note"}
                  </button>
                </div>

                <div className="space-y-3">
                  {contact.notes.map((note) => (
                    <div key={note.id} className={`p-3 rounded-lg border text-sm ${note.isPinned ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-slate-700 leading-relaxed flex-1">{note.content}</p>
                        <button onClick={() => togglePin(note.id, note.isPinned)}
                          className="text-slate-400 hover:text-amber-500 flex-shrink-0 mt-0.5">
                          {note.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {note.author?.name ?? "You"} · {formatRelativeTime(note.createdAt)}
                      </p>
                    </div>
                  ))}
                  {contact.notes.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No notes yet</p>
                  )}
                </div>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader title="Activity Timeline" />
                <div className="space-y-1">
                  {contact.activities.slice(0, 10).map((a) => (
                    <div key={a.id} className="flex gap-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{a.description}</p>
                        <p className="text-xs text-slate-400">{formatRelativeTime(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {contact.activities.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No activity yet</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar info */}
            <div className="space-y-4">
              <Card>
                <CardHeader title="Details" />
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Status</dt>
                    <dd><Badge>{contact.status}</Badge></dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Added</dt>
                    <dd className="text-slate-700">{formatDate(contact.createdAt)}</dd>
                  </div>
                  {contact.dealContacts.length > 0 && (
                    <div>
                      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Deals</dt>
                      <dd className="space-y-1">
                        {contact.dealContacts.map((dc) => (
                          <Link key={dc.deal.id} href={`/deals/${dc.deal.id}`}
                            className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 text-xs">
                            <TrendingUp size={11} />
                            {dc.deal.name}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "emails" && (
          <Card padding={false}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Direction</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contact.emailLogs.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{email.subject}</td>
                    <td className="px-4 py-3">
                      <Badge>{email.direction}</Badge>
                    </td>
                    <td className="px-4 py-3"><Badge>{email.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{formatRelativeTime(email.sentAt)}</td>
                  </tr>
                ))}
                {contact.emailLogs.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No emails logged</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}

        {activeTab === "calls" && (
          <Card padding={false}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Direction</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contact.callLogs.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatRelativeTime(call.calledAt)}</td>
                    <td className="px-4 py-3"><Badge>{call.direction}</Badge></td>
                    <td className="px-4 py-3"><Badge>{call.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{formatDuration(call.duration)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{call.notes ?? "—"}</td>
                  </tr>
                ))}
                {contact.callLogs.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No calls logged</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}

        {activeTab === "deals" && (
          <div className="space-y-3">
            {contact.dealContacts.map((dc) => {
              const stage = getDealStage(dc.deal.stage);
              const type = getDealType(dc.deal.dealType);
              return (
                <Link key={dc.deal.id} href={`/deals/${dc.deal.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{dc.deal.name}</p>
                    <p className="text-sm text-slate-500">{type.label}{dc.role ? ` · ${dc.role}` : ""}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: stage.color + "20", color: stage.color }}>
                    {stage.label}
                  </span>
                </Link>
              );
            })}
            {contact.dealContacts.length === 0 && (
              <div className="py-8 text-center text-slate-400">Not associated with any deals</div>
            )}
          </div>
        )}

        {activeTab === "sequences" && (
          <div className="space-y-3">
            {contact.sequenceEnrollments.map((enr) => (
              <div key={enr.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{enr.sequence.name}</p>
                  <p className="text-sm text-slate-500">Step {enr.currentStep} · Enrolled {formatDate(enr.enrolledAt)}</p>
                </div>
                <Badge>{enr.status}</Badge>
              </div>
            ))}
            {contact.sequenceEnrollments.length === 0 && (
              <div className="py-8 text-center text-slate-400">Not enrolled in any sequences</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
