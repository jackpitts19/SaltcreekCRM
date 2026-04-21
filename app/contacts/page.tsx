"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Search, Mail, Phone, Building2, UserPlus, Upload, Download, Trash2, Tag, GitMerge, FileText } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, LEAD_SOURCES } from "@/lib/utils";
import { useToast } from "@/lib/toast";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  lastContactedAt: string | null;
  tags: string;
  company: { id: string; name: string } | null;
  _count: { emailLogs: number; callLogs: number; notes: number };
}

function getLastContactStyle(dateStr: string | null) {
  if (!dateStr) return { dot: "bg-slate-300", text: "text-slate-400" };
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 7) return { dot: "bg-green-400", text: "text-green-600" };
  if (days <= 30) return { dot: "bg-amber-400", text: "text-amber-600" };
  return { dot: "bg-red-400", text: "text-red-500" };
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "client", label: "Client" },
  { value: "inactive", label: "Inactive" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState("");
  const toast = useToast();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", mobile: "",
    title: "", companyName: "", companyType: "other", status: "prospect", leadSource: "", tags: "", linkedinUrl: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowModal(true);
  }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-uploaded
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/contacts/import", { method: "POST", body: fd });
    const result = await res.json();
    setImporting(false);
    if (!res.ok) {
      toast.error(result.error ?? "Import failed");
    } else {
      toast.success(`Imported ${result.created} contacts (${result.skipped} skipped, ${result.newCompanies} new companies)`);
      load();
    }
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    window.location.href = `/api/contacts/export?${params}`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to create contact");
      return;
    }
    setShowModal(false);
    setForm({ firstName: "", lastName: "", email: "", phone: "", mobile: "",
      title: "", companyName: "", companyType: "other", status: "prospect", leadSource: "", tags: "", linkedinUrl: "" });
    toast.success(`${form.firstName} ${form.lastName} added`);
    load();
  }

  const allSelected = contacts.length > 0 && selected.size === contacts.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleDeleteContact(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete contact");
      return;
    }
    toast.success(`${name} deleted`);
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    load();
  }

  async function handleBulk(action: string, value?: string) {
    setBulkWorking(true);
    const res = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action, value }),
    });
    const result = await res.json();
    setBulkWorking(false);
    if (!res.ok) {
      toast.error(result.error ?? "Bulk action failed");
    } else {
      toast.success(`Updated ${result.count} contacts`);
      setSelected(new Set());
      setShowBulkTag(false);
      setBulkTagValue("");
      load();
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Contacts"
        subtitle={`${contacts.length} contacts`}
        action={{ label: "Add Contact", onClick: () => setShowModal(true) }}
      />

      <div className="p-6">
        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9 pr-3 py-2 w-full text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div className="ml-auto flex gap-2">
            {/* Import CSV */}
            <label className={`flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-colors ${importing ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload size={14} className="text-slate-500" />
              <span className="text-slate-600">{importing ? "Importing..." : "Import CSV"}</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </label>

            {/* Export CSV */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
            >
              <Download size={14} className="text-slate-500" />
              <span className="text-slate-600">Export CSV</span>
            </button>
            <Link href="/contacts/duplicates"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
              <GitMerge size={14} className="text-slate-500" />
              <span className="text-slate-600">Duplicates</span>
            </Link>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-700">{selected.size} selected</span>
            <div className="flex gap-2 ml-2">
              <select
                className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                defaultValue=""
                onChange={(e) => { if (e.target.value) handleBulk("status", e.target.value); e.target.value = ""; }}
                disabled={bulkWorking}
              >
                <option value="">Change status...</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="client">Client</option>
                <option value="inactive">Inactive</option>
              </select>
              {showBulkTag ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    value={bulkTagValue}
                    onChange={(e) => setBulkTagValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && bulkTagValue.trim()) handleBulk("tag", bulkTagValue.trim()); if (e.key === "Escape") { setShowBulkTag(false); setBulkTagValue(""); } }}
                    placeholder="Tag name..."
                    className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white focus:outline-none w-28"
                  />
                  <button onClick={() => { if (bulkTagValue.trim()) handleBulk("tag", bulkTagValue.trim()); }} disabled={!bulkTagValue.trim() || bulkWorking}
                    className="text-sm px-2 py-1 bg-blue-600 text-white rounded-lg disabled:opacity-50">Add</button>
                  <button onClick={() => { setShowBulkTag(false); setBulkTagValue(""); }} className="text-sm px-2 py-1 border border-slate-200 rounded-lg bg-white">✕</button>
                </div>
              ) : (
                <button onClick={() => setShowBulkTag(true)} disabled={bulkWorking}
                  className="flex items-center gap-1 text-sm px-2 py-1 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 text-blue-700">
                  <Tag size={12} /> Add Tag
                </button>
              )}
              <button onClick={() => { if (confirm(`Delete ${selected.size} contacts? This cannot be undone.`)) handleBulk("delete"); }}
                disabled={bulkWorking}
                className="flex items-center gap-1 text-sm px-2 py-1 border border-red-200 rounded-lg bg-white hover:bg-red-50 text-red-600">
                <Trash2 size={12} /> Delete
              </button>
            </div>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-blue-500 hover:text-blue-700">Clear</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Activity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading...</td></tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <UserPlus size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No contacts yet</p>
                    <button onClick={() => setShowModal(true)} className="mt-2 text-blue-600 text-sm hover:underline">
                      Add your first contact
                    </button>
                  </td>
                </tr>
              ) : contacts.map((c) => (
                <tr key={c.id} className={`group hover:bg-slate-50 transition-colors ${selected.has(c.id) ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-3 w-8">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-700">
                          {c.firstName[0]}{c.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                          {c.firstName} {c.lastName}
                        </p>
                        {c.title && <p className="text-xs text-slate-500">{c.title}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.company ? (
                      <Link href={`/companies/${c.company.id}`} className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600">
                        <Building2 size={13} className="text-slate-400" />
                        <span className="text-sm">{c.company.name}</span>
                      </Link>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className={`flex items-center gap-1 ${c._count.emailLogs > 0 ? "text-blue-500" : ""}`} title={`${c._count.emailLogs} emails`}>
                        <Mail size={12} /> {c._count.emailLogs}
                      </span>
                      <span className={`flex items-center gap-1 ${c._count.callLogs > 0 ? "text-green-600" : ""}`} title={`${c._count.callLogs} calls`}>
                        <Phone size={12} /> {c._count.callLogs}
                      </span>
                      <span className={`flex items-center gap-1 ${c._count.notes > 0 ? "text-amber-500" : ""}`} title={`${c._count.notes} notes`}>
                        <FileText size={12} /> {c._count.notes}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const { dot, text } = getLastContactStyle(c.lastContactedAt);
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                          <span className={`text-xs ${text}`}>{formatRelativeTime(c.lastContactedAt)}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {c.email && (
                        <a href={`mailto:${c.email}`} title={c.email}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Mail size={12} /> Email
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} title={c.phone}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                          <Phone size={12} /> Call
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteContact(c.id, `${c.firstName} ${c.lastName}`)}
                        className="ml-auto p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete contact"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Contact"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Create Contact"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <Input label="First Name" required value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} />
          <Input label="Last Name" required value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <Input label="Title / Role" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="col-span-2" />
          <Input
            label="Company Name"
            value={form.companyName}
            onChange={(e) => setForm({...form, companyName: e.target.value})}
            hint="Auto-creates company + AI enrichment if new"
          />
          <Select
            label="Company Type"
            value={form.companyType}
            onChange={(e) => setForm({...form, companyType: e.target.value})}
            options={[
              { value: "sell_side", label: "Sell-Side (Business Owner)" },
              { value: "buy_side", label: "Buy-Side (PE / Family Office)" },
              { value: "service_provider", label: "Service Provider" },
              { value: "other", label: "Other" },
            ]}
          />
          <Input label="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => setForm({...form, linkedinUrl: e.target.value})} className="col-span-2" />
          <Select label="Status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}
            options={[
              { value: "prospect", label: "Prospect" },
              { value: "active", label: "Active" },
              { value: "client", label: "Client" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <Select label="Lead Source" value={form.leadSource} onChange={(e) => setForm({...form, leadSource: e.target.value})}
            options={[{ value: "", label: "Select source..." }, ...LEAD_SOURCES.map(s => ({ value: s.id, label: s.label }))]}
          />
          <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} className="col-span-2" hint="e.g. M&A, CFO, Decision Maker" />
        </form>
      </Modal>
    </div>
  );
}
