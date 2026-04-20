"use client";

import { useState, useEffect, use } from "react";
import TopBar from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Globe, MapPin, Users, DollarSign, ChevronLeft, Building2, Pin, PinOff, Mail, Phone, Sparkles, Linkedin } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatRelativeTime, formatDate, formatDuration, getDealStage, getDealType } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/lib/toast";

interface EmailLog {
  id: string; subject: string; direction: string; status: string;
  fromEmail: string; toEmail: string; sentAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  user: { id: string; name: string } | null;
}

interface CallLog {
  id: string; direction: string; status: string; duration: number | null;
  notes: string | null; calledAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  user: { id: string; name: string } | null;
}

interface CompanyDetail {
  id: string; name: string; industry: string | null; subIndustry: string | null;
  description: string | null; website: string | null; linkedinUrl: string | null;
  hqLocation: string | null; employeeCount: number | null; revenue: number | null;
  status: string; tier: string; type: string; tags: string; enrichedAt: string | null;
  createdAt: string;
  contacts: Array<{ id: string; firstName: string; lastName: string; title: string | null; status: string; _count: { emailLogs: number; callLogs: number } }>;
  deals: Array<{ id: string; name: string; stage: string; dealType: string; value: number | null; assignedTo: { name: string } | null }>;
  notes: Array<{ id: string; content: string; isPinned: boolean; createdAt: string; author: { name: string } | null }>;
  activities: Array<{ id: string; type: string; description: string; createdAt: string }>;
  emailLogs: EmailLog[];
  callLogs: CallLog[];
}

type Tab = "overview" | "emails" | "calls";

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser } = useUser();
  const toast = useToast();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [enriching, setEnriching] = useState(false);

  async function load() {
    const res = await fetch(`/api/companies/${id}`);
    setCompany(await res.json());
  }

  useEffect(() => { load(); }, [id]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, companyId: id, authorId: currentUser?.id ?? null }),
    });
    setNoteText("");
    setAddingNote(false);
    toast.success("Note saved");
    load();
  }

  async function enrichCompany() {
    setEnriching(true);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: id }),
      });
      if (res.ok) {
        toast.success("Company enriched with AI data");
        load();
      } else {
        toast.error("Enrichment failed — check OpenAI key");
      }
    } finally {
      setEnriching(false);
    }
  }

  async function togglePin(noteId: string, isPinned: boolean) {
    await fetch(`/api/notes?id=${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !isPinned }),
    });
    load();
  }

  if (!company) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );

  const tierLabel: Record<string, string> = { "1": "Tier 1", "2": "Tier 2", "3": "Tier 3" };

  const tabs = [
    { id: "overview" as Tab, label: "Overview" },
    { id: "emails" as Tab, label: `Emails (${company.emailLogs.length})` },
    { id: "calls" as Tab, label: `Calls (${company.callLogs.length})` },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title={company.name}
        subtitle={[company.industry, company.hqLocation].filter(Boolean).join(" · ")}
        action={{
          label: enriching ? "Enriching..." : "Enrich with AI",
          onClick: enrichCompany,
        }}
      />

      <div className="p-6 space-y-5">
        <Link href="/companies" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 w-fit">
          <ChevronLeft size={14} /> Back to Companies
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
                <Badge>{company.status}</Badge>
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                  {tierLabel[company.tier] ?? `Tier ${company.tier}`}
                </span>
              </div>
              {company.industry && <p className="text-slate-500 mt-0.5">{company.industry}{company.subIndustry ? ` · ${company.subIndustry}` : ""}</p>}
              {company.description && <p className="text-sm text-slate-600 mt-2 max-w-2xl">{company.description}</p>}
            </div>
            <div className="flex flex-col gap-2 text-sm flex-shrink-0">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
                  <Globe size={14} className="text-slate-400" /> {company.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {company.linkedinUrl && (
                <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
                  <Linkedin size={14} className="text-slate-400" /> LinkedIn
                </a>
              )}
              {company.hqLocation && (
                <p className="flex items-center gap-2 text-slate-600">
                  <MapPin size={14} className="text-slate-400" /> {company.hqLocation}
                </p>
              )}
              {company.revenue && (
                <p className="flex items-center gap-2 text-slate-600">
                  <DollarSign size={14} className="text-slate-400" /> {formatCurrency(company.revenue)} revenue
                </p>
              )}
              {company.employeeCount && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Users size={14} className="text-slate-400" /> {company.employeeCount.toLocaleString()} employees
                </p>
              )}
              {company.enrichedAt && (
                <p className="flex items-center gap-2 text-xs text-emerald-600">
                  <Sparkles size={12} /> AI enriched {formatRelativeTime(company.enrichedAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Contacts", value: company.contacts.length },
            { label: "Open Deals", value: company.deals.length },
            { label: "Emails", value: company.emailLogs.length },
            { label: "Calls", value: company.callLogs.length },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
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

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Deals */}
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Deals ({company.deals.length})</h3>
                  <Link href="/deals" className="text-sm text-blue-600 hover:text-blue-700">View all →</Link>
                </div>
                {company.deals.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No deals yet</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {company.deals.map((deal) => {
                      const stage = getDealStage(deal.stage);
                      const type = getDealType(deal.dealType);
                      return (
                        <Link key={deal.id} href={`/deals/${deal.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{deal.name}</p>
                            <p className="text-xs text-slate-500">{type.label}{deal.assignedTo ? ` · ${deal.assignedTo.name}` : ""}</p>
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{formatCurrency(deal.value)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: stage.color + "20", color: stage.color }}>
                            {stage.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader title="Notes" />
                <div className="mb-4">
                  <Textarea placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)}
                    rows={3} className="mb-2"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }} />
                  <button onClick={addNote} disabled={addingNote || !noteText.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                    {addingNote ? "Saving..." : "Add Note"}
                  </button>
                </div>
                <div className="space-y-3">
                  {company.notes.map((note) => (
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
                  {company.notes.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No notes yet</p>}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card padding={false}>
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Contacts ({company.contacts.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {company.contacts.map((c) => (
                    <Link key={c.id} href={`/contacts/${c.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-700">{c.firstName[0]}{c.lastName[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{c.firstName} {c.lastName}</p>
                        {c.title && <p className="text-xs text-slate-500 truncate">{c.title}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
                        {c._count.emailLogs > 0 && (
                          <span className="flex items-center gap-0.5"><Mail size={10} /> {c._count.emailLogs}</span>
                        )}
                        {c._count.callLogs > 0 && (
                          <span className="flex items-center gap-0.5"><Phone size={10} /> {c._count.callLogs}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {company.contacts.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-sm">No contacts linked</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === "emails" && (
          <Card padding={false}>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">All emails across {company.contacts.length} contact{company.contacts.length !== 1 ? "s" : ""} at {company.name}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Direction</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Logged by</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {company.emailLogs.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{email.subject}</td>
                    <td className="px-4 py-3">
                      {email.contact ? (
                        <Link href={`/contacts/${email.contact.id}`} className="text-blue-600 hover:underline text-xs">
                          {email.contact.firstName} {email.contact.lastName}
                        </Link>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge>{email.direction}</Badge></td>
                    <td className="px-4 py-3"><Badge>{email.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{email.user?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatRelativeTime(email.sentAt)}</td>
                  </tr>
                ))}
                {company.emailLogs.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">No emails logged for any contacts at this company</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}

        {/* Calls Tab */}
        {activeTab === "calls" && (
          <Card padding={false}>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">All calls across {company.contacts.length} contact{company.contacts.length !== 1 ? "s" : ""} at {company.name}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Direction</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Logged by</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {company.callLogs.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">{formatRelativeTime(call.calledAt)}</td>
                    <td className="px-4 py-3">
                      {call.contact ? (
                        <Link href={`/contacts/${call.contact.id}`} className="text-blue-600 hover:underline text-xs">
                          {call.contact.firstName} {call.contact.lastName}
                        </Link>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge>{call.direction}</Badge></td>
                    <td className="px-4 py-3"><Badge>{call.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDuration(call.duration)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{call.user?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{call.notes ?? "—"}</td>
                  </tr>
                ))}
                {company.callLogs.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">No calls logged for any contacts at this company</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
