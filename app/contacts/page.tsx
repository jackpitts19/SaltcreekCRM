"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Search, Filter, Link2, Mail, Phone, Building2, UserPlus } from "lucide-react";
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
  const toast = useToast();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", mobile: "",
    title: "", companyId: "", status: "prospect", leadSource: "", tags: "", linkedinUrl: "",
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ firstName: "", lastName: "", email: "", phone: "", mobile: "",
      title: "", companyId: "", status: "prospect", leadSource: "", tags: "", linkedinUrl: "" });
    toast.success(`${form.firstName} ${form.lastName} added`);
    load();
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
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Activity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading...</td></tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <UserPlus size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No contacts yet</p>
                    <button onClick={() => setShowModal(true)} className="mt-2 text-blue-600 text-sm hover:underline">
                      Add your first contact
                    </button>
                  </td>
                </tr>
              ) : contacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
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
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {c._count.emailLogs}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {c._count.callLogs}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatRelativeTime(c.lastContactedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Mail size={14} />
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="text-slate-400 hover:text-green-600 transition-colors">
                          <Phone size={14} />
                        </a>
                      )}
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
