"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Input, { Textarea, Select } from "@/components/ui/Input";
import {
  Mail, Phone, Building2, Link2, Clock, ExternalLink,
  Pin, PinOff, ChevronLeft, TrendingUp, Sparkles,
  CheckSquare, Square, Trash2, Plus, FileText, Brain, RefreshCw,
  MessageSquare, Send, PhoneForwarded, Mic, StickyNote
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, formatDate, formatDuration, getDealStage, getDealType } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/lib/toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  completedAt: string | null;
}

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
    source: string; meetingTitle: string | null; meetingDate: string | null;
    author: { name: string } | null;
  }>;
  emailLogs: Array<{
    id: string; subject: string; direction: string; status: string; fromEmail: string; toEmail: string; sentAt: string;
  }>;
  callLogs: Array<{
    id: string; direction: string; status: string; duration: number | null; notes: string | null; calledAt: string;
  }>;
  textMessages: Array<{
    id: string; body: string; direction: string; status: string; fromNumber: string | null; toNumber: string | null; sentAt: string;
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
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "emails" | "calls" | "texts" | "deals" | "tasks" | "sequences">("overview");
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", priority: "medium" });
  const [savingTask, setSavingTask] = useState(false);

  // AI Intel state
  const [intel, setIntel] = useState<string | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // AI Summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // SMS state
  const [smsBody, setSmsBody] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  // Edit contact state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "", mobile: "", title: "", linkedinUrl: "", status: "prospect", tags: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Granola import state
  const [showGranolaModal, setShowGranolaModal] = useState(false);
  const [granolaForm, setGranolaForm] = useState({ meetingTitle: "", meetingDate: "", transcript: "", notes: "" });
  const [savingGranola, setSavingGranola] = useState(false);

  async function load() {
    const res = await fetch(`/api/contacts/${id}`);
    const data = await res.json();
    setContact(data);
  }

  async function loadTasks() {
    const res = await fetch(`/api/tasks?contactId=${id}`);
    const data = await res.json();
    setTasks(data);
  }

  useEffect(() => {
    load();
    loadTasks();
  }, [id]);

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

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setSavingTask(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, contactId: id }),
    });
    setSavingTask(false);
    setShowTaskModal(false);
    setTaskForm({ title: "", description: "", dueDate: "", priority: "medium" });
    toast.success("Task created");
    loadTasks();
  }

  async function completeTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    loadTasks();
  }

  async function reopenTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    loadTasks();
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    loadTasks();
  }

  async function generateIntel() {
    setLoadingIntel(true);
    setIntelError(null);
    try {
      const res = await fetch(`/api/contacts/${id}/intel`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setIntelError(data.error);
      } else {
        setIntel(data.bio ?? null);
      }
    } catch {
      setIntelError("Failed to generate intel");
    }
    setLoadingIntel(false);
  }

  async function generateSummary() {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: id }),
      });
      const data = await res.json();
      if (data.error) {
        setSummaryError(data.error);
      } else {
        setSummary(data.summary ?? null);
      }
    } catch {
      setSummaryError("Failed to generate summary");
    }
    setLoadingSummary(false);
  }

  async function sendSms(e: React.FormEvent) {
    e.preventDefault();
    if (!smsBody.trim()) return;
    const toPhone = contact?.mobile || contact?.phone;
    if (!toPhone) return;
    setSendingSms(true);
    await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: id, toPhone, body: smsBody }),
    });
    setSmsBody("");
    setSendingSms(false);
    toast.success("Text sent");
    load();
  }

  const [calling, setCalling] = useState(false);
  async function startCall() {
    const phone = contact?.mobile || contact?.phone;
    if (!phone) { toast.error("No phone number on record"); return; }
    setCalling(true);
    const res = await fetch("/api/dialer/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactPhone: phone, contactId: id }),
    });
    setCalling(false);
    if (res.ok) {
      toast.success(`Calling ${contact?.firstName}…`);
    } else {
      toast.error("Call failed — check Twilio config");
    }
  }

  function openEditModal() {
    if (!contact) return;
    setEditForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      mobile: contact.mobile ?? "",
      title: contact.title ?? "",
      linkedinUrl: contact.linkedinUrl ?? "",
      status: contact.status,
      tags: contact.tags ?? "",
    });
    setShowEditModal(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSavingEdit(false);
    if (!res.ok) {
      toast.error("Failed to save changes");
      return;
    }
    setShowEditModal(false);
    toast.success("Contact updated");
    load();
  }

  async function deleteContact() {
    if (!contact) return;
    if (!confirm(`Delete ${contact.firstName} ${contact.lastName}? This cannot be undone.`)) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete contact"); return; }
    toast.success(`${contact.firstName} ${contact.lastName} deleted`);
    router.push("/contacts");
  }

  async function importGranola(e: React.FormEvent) {
    e.preventDefault();
    setSavingGranola(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: granolaForm.notes || granolaForm.transcript.slice(0, 500),
        contactId: id,
        authorId: currentUser?.id ?? null,
        source: "granola",
        meetingTitle: granolaForm.meetingTitle || null,
        meetingDate: granolaForm.meetingDate ? new Date(granolaForm.meetingDate).toISOString() : null,
        transcript: granolaForm.transcript || null,
      }),
    });
    setSavingGranola(false);
    setShowGranolaModal(false);
    setGranolaForm({ meetingTitle: "", meetingDate: "", transcript: "", notes: "" });
    toast.success("Meeting notes imported");
    load();
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "done");

  const priorityColor: Record<string, string> = {
    high: "text-red-600 bg-red-50",
    medium: "text-amber-600 bg-amber-50",
    low: "text-slate-500 bg-slate-100",
  };

  const totalInteractions = contact.emailLogs.length + contact.callLogs.length + contact.textMessages.length + contact.notes.length;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "timeline", label: `Timeline (${totalInteractions})` },
    { id: "tasks", label: `Tasks (${pendingTasks.length})` },
    { id: "emails", label: `Emails (${contact.emailLogs.length})` },
    { id: "calls", label: `Calls (${contact.callLogs.length})` },
    { id: "texts", label: `Texts (${contact.textMessages.length})` },
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

            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              {/* Call Prep Button */}
              <Link
                href={`/contacts/${id}/prep`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Sparkles size={14} />
                Call Prep
              </Link>

              <div className="flex gap-2">
                {/* Edit button */}
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors"
                >
                  Edit
                </button>

                {/* Delete button */}
                <button
                  onClick={deleteContact}
                  className="flex items-center gap-2 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                  Delete
                </button>

                {/* Granola import button */}
                <button
                  onClick={() => setShowGranolaModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors"
                >
                  <FileText size={13} />
                  Import Meeting Notes
                </button>
              </div>

              <div className="flex flex-col gap-1 text-sm text-right">
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
                    <Link2 size={14} className="text-slate-400" /> LinkedIn
                    <ExternalLink size={11} />
                  </a>
                )}
                <p className="flex items-center gap-2 text-slate-400">
                  <Clock size={13} /> Last contact: {formatRelativeTime(contact.lastContactedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={startCall}
            disabled={calling || (!contact.phone && !contact.mobile)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Phone size={14} />
            {calling ? "Calling…" : "Call"}
          </button>
          <button
            onClick={() => setActiveTab("texts")}
            disabled={!contact.phone && !contact.mobile}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <MessageSquare size={14} />
            Text
          </button>
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Mail size={14} />
              Email
            </a>
          )}
          <Link
            href={`/calls/dialer?contactId=${id}`}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <PhoneForwarded size={14} />
            Dialer
          </Link>
          <Link
            href={`/meetings/record?contactId=${id}`}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Mic size={14} />
            Record Meeting
          </Link>
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

        {/* ── TIMELINE ── */}
        {activeTab === "timeline" && (() => {
          type TimelineItem = {
            id: string;
            date: string;
            type: "email" | "call" | "text" | "note";
            icon: React.ReactNode;
            title: string;
            body?: string | null;
            meta?: string | null;
          };
          const items: TimelineItem[] = [
            ...contact.emailLogs.map((e) => ({
              id: e.id, date: e.sentAt, type: "email" as const,
              icon: <Mail size={14} className="text-blue-500" />,
              title: e.subject || "(no subject)",
              body: null,
              meta: e.direction === "inbound" ? `From ${e.fromEmail}` : `To ${e.toEmail}`,
            })),
            ...contact.callLogs.map((c) => ({
              id: c.id, date: c.calledAt, type: "call" as const,
              icon: <Phone size={14} className="text-green-600" />,
              title: `${c.direction === "inbound" ? "Inbound" : "Outbound"} call — ${c.status}`,
              body: c.notes,
              meta: c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : null,
            })),
            ...contact.textMessages.map((t) => ({
              id: t.id, date: t.sentAt, type: "text" as const,
              icon: <MessageSquare size={14} className="text-violet-500" />,
              title: `${t.direction === "inbound" ? "Received" : "Sent"} text`,
              body: t.body,
              meta: null,
            })),
            ...contact.notes.map((n) => ({
              id: n.id, date: n.createdAt, type: "note" as const,
              icon: <StickyNote size={14} className="text-amber-500" />,
              title: n.meetingTitle || (n.source === "call" ? "Call note" : n.source === "granola" ? "Meeting import" : "Note"),
              body: n.content,
              meta: n.author?.name || null,
            })),
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          return (
            <div className="space-y-1">
              {items.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-sm">No interactions yet</div>
              )}
              {items.map((item, idx) => {
                const d = new Date(item.date);
                const showDateDivider = idx === 0 || new Date(items[idx - 1].date).toDateString() !== d.toDateString();
                return (
                  <div key={item.id}>
                    {showDateDivider && (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs font-medium text-slate-400 flex-shrink-0">
                          {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                    )}
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-900">{item.title}</p>
                          {item.meta && <span className="text-xs text-slate-400">{item.meta}</span>}
                          <span className="text-xs text-slate-400 ml-auto">
                            {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        {item.body && (
                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap line-clamp-3">{item.body}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* AI Intel Card */}
              <Card>
                <CardHeader title="AI Intel" />
                {intel ? (
                  <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                    {intel.split("\n").map((line, i) => {
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return (
                          <p key={i} className="font-semibold text-slate-900 mt-3 first:mt-0">
                            {line.replace(/\*\*/g, "")}
                          </p>
                        );
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <p key={i} className="text-slate-600 pl-2">
                            · {line.slice(2)}
                          </p>
                        );
                      }
                      if (line.trim() === "") return null;
                      return <p key={i}>{line}</p>;
                    })}
                    <button
                      onClick={generateIntel}
                      disabled={loadingIntel}
                      className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <RefreshCw size={11} className={loadingIntel ? "animate-spin" : ""} />
                      Regenerate
                    </button>
                  </div>
                ) : loadingIntel ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                    <Brain size={16} className="text-blue-400 animate-pulse" />
                    Researching {contact.firstName}...
                  </div>
                ) : intelError ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-red-500 mb-3">{intelError}</p>
                    <button
                      onClick={generateIntel}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Brain size={20} className="text-slate-300 flex-shrink-0" />
                      <p className="text-sm text-slate-400">
                        AI-powered brief on {contact.firstName} — pulls from your CRM history and searches the web.
                      </p>
                    </div>
                    <button
                      onClick={generateIntel}
                      className="flex items-center gap-1.5 flex-shrink-0 ml-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Sparkles size={12} />
                      Generate
                    </button>
                  </div>
                )}
              </Card>

              {/* AI Summary Card */}
              <Card>
                <CardHeader title="AI Relationship Summary" />
                {summary ? (
                  <div className="text-sm text-slate-700 leading-relaxed space-y-1.5">
                    {summary.split("\n").filter(Boolean).map((line, i) => (
                      <p key={i} className={line.startsWith("•") ? "flex gap-2" : ""}>
                        {line.startsWith("•") ? (
                          <>
                            <span className="text-blue-500 flex-shrink-0">•</span>
                            <span>{line.slice(1).trim()}</span>
                          </>
                        ) : line}
                      </p>
                    ))}
                    <button
                      onClick={generateSummary}
                      disabled={loadingSummary}
                      className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <RefreshCw size={11} className={loadingSummary ? "animate-spin" : ""} />
                      Regenerate
                    </button>
                  </div>
                ) : loadingSummary ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                    <Brain size={16} className="text-blue-400 animate-pulse" />
                    Summarizing relationship history...
                  </div>
                ) : summaryError ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-red-500 mb-3">{summaryError}</p>
                    <button onClick={generateSummary} className="text-xs text-blue-600 hover:underline">Try again</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm text-slate-400">
                      Summarize notes, emails, calls, and deal context into a 3–5 bullet briefing.
                    </p>
                    <button
                      onClick={generateSummary}
                      className="flex items-center gap-1.5 flex-shrink-0 ml-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Sparkles size={12} />
                      Summarize
                    </button>
                  </div>
                )}
              </Card>

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
                    <div key={note.id} className={`p-3 rounded-lg border text-sm ${note.isPinned ? "bg-amber-50 border-amber-200" : note.source === "granola" ? "bg-purple-50 border-purple-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {note.meetingTitle && (
                            <p className="font-medium text-slate-800 mb-1">
                              {note.source === "granola" && <span className="text-purple-600 mr-1">📝</span>}
                              {note.meetingTitle}
                              {note.meetingDate && <span className="text-xs font-normal text-slate-400 ml-2">{formatDate(note.meetingDate)}</span>}
                            </p>
                          )}
                          <p className="text-slate-700 leading-relaxed">{note.content}</p>
                        </div>
                        <button onClick={() => togglePin(note.id, note.isPinned)}
                          className="text-slate-400 hover:text-amber-500 flex-shrink-0 mt-0.5">
                          {note.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {note.source === "granola" ? "Granola" : (note.author?.name ?? "You")} · {formatRelativeTime(note.createdAt)}
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

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Pending Tasks widget */}
              {pendingTasks.length > 0 && (
                <Card>
                  <CardHeader title="Open Tasks" action={
                    <button onClick={() => setShowTaskModal(true)} className="text-xs text-blue-600 hover:underline">Add</button>
                  } />
                  <div className="space-y-2">
                    {pendingTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-start gap-2 group">
                        <button onClick={() => completeTask(task.id)} className="mt-0.5 text-slate-300 hover:text-green-500 flex-shrink-0">
                          <Square size={14} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate">{task.title}</p>
                          {task.dueDate && (
                            <p className="text-xs text-slate-400">{formatDate(task.dueDate)}</p>
                          )}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${priorityColor[task.priority] ?? ""}`}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                    {pendingTasks.length > 5 && (
                      <button onClick={() => setActiveTab("tasks")} className="text-xs text-blue-600 hover:underline">
                        +{pendingTasks.length - 5} more tasks
                      </button>
                    )}
                  </div>
                </Card>
              )}

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

        {/* ── TASKS ── */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={14} /> Add Task
              </button>
            </div>

            {/* Pending */}
            {pendingTasks.length > 0 && (
              <Card>
                <CardHeader title="Pending" />
                <div className="divide-y divide-slate-100">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 py-3 group">
                      <button onClick={() => completeTask(task.id)} className="text-slate-300 hover:text-green-500 flex-shrink-0">
                        <Square size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{task.title}</p>
                        {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
                        {task.dueDate && <p className="text-xs text-slate-400 mt-0.5">Due {formatDate(task.dueDate)}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${priorityColor[task.priority] ?? ""}`}>
                        {task.priority}
                      </span>
                      <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Completed */}
            {completedTasks.length > 0 && (
              <Card>
                <CardHeader title="Completed" />
                <div className="divide-y divide-slate-100">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 py-3 group opacity-60">
                      <button onClick={() => reopenTask(task.id)} className="text-green-500 hover:text-slate-400 flex-shrink-0">
                        <CheckSquare size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 line-through">{task.title}</p>
                        {task.completedAt && <p className="text-xs text-slate-400 mt-0.5">Completed {formatRelativeTime(task.completedAt)}</p>}
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <CheckSquare size={32} className="mx-auto mb-3 text-slate-300" />
                <p>No tasks yet</p>
                <button onClick={() => setShowTaskModal(true)} className="mt-2 text-blue-600 text-sm hover:underline">
                  Add a task
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── EMAILS ── */}
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
                    <td className="px-4 py-3"><Badge>{email.direction}</Badge></td>
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

        {/* ── CALLS ── */}
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

        {/* ── TEXTS ── */}
        {activeTab === "texts" && (
          <div className="flex flex-col gap-4">
            {/* Conversation thread */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 min-h-[200px] max-h-[500px] overflow-y-auto">
              {contact.textMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <MessageSquare size={32} className="mb-3 text-slate-300" />
                  <p>No messages yet</p>
                </div>
              )}
              {contact.textMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                    msg.direction === "outbound"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}>
                    <p>{msg.body}</p>
                    <p className={`text-xs mt-1 ${msg.direction === "outbound" ? "text-blue-200" : "text-slate-400"}`}>
                      {formatRelativeTime(msg.sentAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Compose */}
            {(contact.phone || contact.mobile) ? (
              <form onSubmit={sendSms} className="flex gap-2">
                <input
                  type="text"
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  placeholder={`Send a text to ${contact.mobile || contact.phone}...`}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sendingSms || !smsBody.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send size={14} />
                  {sendingSms ? "Sending..." : "Send"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-400 text-center">No phone number on file — add one to enable texting.</p>
            )}
          </div>
        )}

        {/* ── DEALS ── */}
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

        {/* ── SEQUENCES ── */}
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

      {/* Add Task Modal */}
      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Add Task"
        footer={
          <>
            <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={createTask} disabled={savingTask || !taskForm.title.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {savingTask ? "Saving..." : "Create Task"}
            </button>
          </>
        }
      >
        <form onSubmit={createTask} className="space-y-4">
          <Input label="Task Title" required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
          <Textarea label="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            <Select label="Priority" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              options={[{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Contact"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={saveEdit} disabled={savingEdit}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        <form onSubmit={saveEdit} className="grid grid-cols-2 gap-4">
          <Input label="First Name" required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
          <Input label="Last Name" required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Input label="Phone" type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <Input label="Mobile" type="tel" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
          <Input label="Title / Role" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          <Input label="LinkedIn URL" value={editForm.linkedinUrl} onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })} className="col-span-2" />
          <Select label="Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: "prospect", label: "Prospect" },
              { value: "active", label: "Active" },
              { value: "client", label: "Client" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <Input label="Tags (comma separated)" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} hint="e.g. M&A, CFO, Decision Maker" />
        </form>
      </Modal>

      {/* Granola Import Modal */}
      <Modal
        open={showGranolaModal}
        onClose={() => setShowGranolaModal(false)}
        title="Import Meeting Notes"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowGranolaModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={importGranola} disabled={savingGranola || (!granolaForm.notes.trim() && !granolaForm.transcript.trim())}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {savingGranola ? "Importing..." : "Import Notes"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Paste your Granola AI meeting notes or any transcript here to save it to this contact.</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Meeting Title" placeholder="e.g. Intro Call" value={granolaForm.meetingTitle} onChange={(e) => setGranolaForm({ ...granolaForm, meetingTitle: e.target.value })} />
            <Input label="Meeting Date" type="date" value={granolaForm.meetingDate} onChange={(e) => setGranolaForm({ ...granolaForm, meetingDate: e.target.value })} />
          </div>
          <Textarea
            label="Summary / Notes"
            placeholder="Key takeaways, action items, discussion points..."
            value={granolaForm.notes}
            onChange={(e) => setGranolaForm({ ...granolaForm, notes: e.target.value })}
            rows={4}
          />
          <Textarea
            label="Full Transcript (optional)"
            placeholder="Paste the full meeting transcript here..."
            value={granolaForm.transcript}
            onChange={(e) => setGranolaForm({ ...granolaForm, transcript: e.target.value })}
            rows={6}
          />
          <p className="text-xs text-slate-400">The full transcript is stored and used in Call Prep AI briefings</p>
        </div>
      </Modal>
    </div>
  );
}
