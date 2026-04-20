"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select, Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Search, Mail, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { useUser } from "@/lib/userContext";

interface EmailLog {
  id: string; subject: string; direction: string; fromEmail: string; toEmail: string;
  status: string; sentAt: string; body: string | null;
  contact: { id: string; firstName: string; lastName: string } | null;
}

export default function EmailsPage() {
  const { currentUser } = useUser();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({
    subject: "", body: "", fromEmail: "", toEmail: "", ccEmail: "",
    direction: "outbound", status: "sent", contactId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/emails?${params}`);
    setEmails(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, userId: currentUser?.id ?? null }),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ subject: "", body: "", fromEmail: "", toEmail: "", ccEmail: "", direction: "outbound", status: "sent", contactId: "" });
    load();
  }

  const statusColors: Record<string, string> = {
    sent: "bg-slate-100 text-slate-600",
    delivered: "bg-blue-100 text-blue-700",
    opened: "bg-green-100 text-green-700",
    replied: "bg-emerald-100 text-emerald-700",
    bounced: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Emails" subtitle={`${emails.length} emails logged`}
        action={{ label: "Log Email", onClick: () => setShowModal(true) }} />

      {/* Gmail connect banner */}
      <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-blue-600" />
          <p className="text-sm text-blue-800">
            <strong>Connect Gmail</strong> to automatically sync and track emails
          </p>
        </div>
        <Link href="/settings" className="text-sm font-medium text-blue-700 hover:text-blue-900 border border-blue-300 px-3 py-1 rounded-lg bg-white">
          Set up →
        </Link>
      </div>

      <div className="p-6">
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails..."
              className="pl-9 pr-3 py-2 w-full text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : emails.length === 0 ? (
            <div className="py-12 text-center">
              <Mail size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No emails logged yet</p>
              <button onClick={() => setShowModal(true)} className="mt-2 text-blue-600 text-sm hover:underline">Log your first email</button>
            </div>
          ) : emails.map((email) => (
            <div key={email.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  email.direction === "inbound" ? "bg-purple-100" : "bg-blue-100"
                }`}>
                  {email.direction === "inbound"
                    ? <ArrowDownLeft size={14} className="text-purple-600" />
                    : <ArrowUpRight size={14} className="text-blue-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{email.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {email.direction === "outbound" ? `To: ${email.toEmail}` : `From: ${email.fromEmail}`}
                    {email.contact && (
                      <span> · <Link href={`/contacts/${email.contact.id}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {email.contact.firstName} {email.contact.lastName}
                      </Link></span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[email.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {email.status}
                  </span>
                  <span className="text-xs text-slate-400">{formatRelativeTime(email.sentAt)}</span>
                </div>
              </button>
              {expanded === email.id && email.body && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{email.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Email" size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleLog} disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Log Email"}
            </button>
          </>
        }
      >
        <form onSubmit={handleLog} className="grid grid-cols-2 gap-4">
          <Select label="Direction" value={form.direction} onChange={(e) => setForm({...form, direction: e.target.value})}
            options={[{ value: "outbound", label: "Outbound (Sent)" }, { value: "inbound", label: "Inbound (Received)" }]} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}
            options={[{ value: "sent", label: "Sent" }, { value: "delivered", label: "Delivered" }, { value: "opened", label: "Opened" }, { value: "replied", label: "Replied" }, { value: "bounced", label: "Bounced" }]} />
          <Input label="From" required value={form.fromEmail} onChange={(e) => setForm({...form, fromEmail: e.target.value})} placeholder="you@firm.com" />
          <Input label="To" required value={form.toEmail} onChange={(e) => setForm({...form, toEmail: e.target.value})} placeholder="contact@company.com" />
          <Input label="Subject" required value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="col-span-2" />
          <Textarea label="Body" value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} rows={5} className="col-span-2" />
        </form>
      </Modal>
    </div>
  );
}
