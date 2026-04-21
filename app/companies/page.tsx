"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select, Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Search, Building2, Globe, MapPin, Users, TrendingUp, Upload, Download } from "lucide-react";
import { useToast } from "@/lib/toast";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  hqLocation: string | null;
  website: string | null;
  revenue: number | null;
  status: string;
  tier: string;
  _count: { contacts: number; deals: number };
}

const industries = [
  "Technology", "Healthcare", "Financial Services", "Energy", "Real Estate",
  "Manufacturing", "Retail", "Media & Entertainment", "Telecommunications",
  "Consumer Goods", "Industrials", "Materials", "Utilities", "Transportation",
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    name: "", domain: "", industry: "", subIndustry: "", description: "",
    website: "", linkedinUrl: "", hqLocation: "", employeeCount: "",
    revenue: "", status: "prospect", tier: "tier3",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/companies?${params}`);
    setCompanies(await res.json());
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/companies/import", { method: "POST", body: fd });
    const result = await res.json();
    setImporting(false);
    if (!res.ok) {
      toast.error(result.error ?? "Import failed");
    } else {
      toast.success(`Imported ${result.created} companies (${result.skipped} skipped)`);
      load();
    }
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    window.location.href = `/api/companies/export?${params}`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ name: "", domain: "", industry: "", subIndustry: "", description: "",
      website: "", linkedinUrl: "", hqLocation: "", employeeCount: "", revenue: "", status: "prospect", tier: "tier3" });
    load();
  }

  const tierLabel: Record<string, string> = { tier1: "Tier 1", tier2: "Tier 2", tier3: "Tier 3" };
  const tierColors: Record<string, string> = {
    tier1: "bg-blue-100 text-blue-700",
    tier2: "bg-purple-100 text-purple-700",
    tier3: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Companies"
        subtitle={`${companies.length} accounts`}
        action={{ label: "Add Company", onClick: () => setShowModal(true) }}
      />

      <div className="p-6">
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="pl-9 pr-3 py-2 w-full text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
            <option value="">All Statuses</option>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="client">Client</option>
            <option value="inactive">Inactive</option>
          </select>
          <label className={`flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50 ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload size={14} className="text-slate-500" />
            {importing ? "Importing..." : "Import"}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
            <Download size={14} className="text-slate-500" />
            Export
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Industry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Revenue</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Relations</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading...</td></tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No companies yet</p>
                    <button onClick={() => setShowModal(true)} className="mt-2 text-blue-600 text-sm hover:underline">
                      Add your first company
                    </button>
                  </td>
                </tr>
              ) : companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-indigo-600" />
                      </div>
                      <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        {c.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.hqLocation ? (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" /> {c.hqLocation}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {formatCurrency(c.revenue)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-xs">
                      <span className={`flex items-center gap-1 ${c._count.contacts > 0 ? "text-blue-500" : "text-slate-400"}`}>
                        <Users size={12} /> {c._count.contacts}
                      </span>
                      <span className={`flex items-center gap-1 ${c._count.deals > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        <TrendingUp size={12} /> {c._count.deals}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge>{c.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColors[c.tier] ?? "bg-slate-100 text-slate-600"}`}>
                        {tierLabel[c.tier] ?? c.tier}
                      </span>
                      {c.website && (
                        <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Visit website"
                          onClick={(e) => e.stopPropagation()}>
                          <Globe size={13} />
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Company" size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Create Company"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <Input label="Company Name" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="col-span-2" />
          <Input label="Domain" placeholder="example.com" value={form.domain} onChange={(e) => setForm({...form, domain: e.target.value})} />
          <Input label="Website" placeholder="https://..." value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} />
          <Select label="Industry" value={form.industry} onChange={(e) => setForm({...form, industry: e.target.value})}
            options={[{ value: "", label: "Select industry..." }, ...industries.map(i => ({ value: i, label: i }))]} />
          <Input label="Sub-Industry" value={form.subIndustry} onChange={(e) => setForm({...form, subIndustry: e.target.value})} />
          <Input label="HQ Location" placeholder="New York, NY" value={form.hqLocation} onChange={(e) => setForm({...form, hqLocation: e.target.value})} />
          <Input label="Revenue ($M)" type="number" placeholder="500" value={form.revenue} onChange={(e) => setForm({...form, revenue: e.target.value})} />
          <Input label="Employees" type="number" value={form.employeeCount} onChange={(e) => setForm({...form, employeeCount: e.target.value})} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}
            options={[{ value: "prospect", label: "Prospect" }, { value: "active", label: "Active" }, { value: "client", label: "Client" }, { value: "inactive", label: "Inactive" }]} />
          <Select label="Tier" value={form.tier} onChange={(e) => setForm({...form, tier: e.target.value})}
            options={[{ value: "tier1", label: "Tier 1" }, { value: "tier2", label: "Tier 2" }, { value: "tier3", label: "Tier 3" }]} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="col-span-2" />
        </form>
      </Modal>
    </div>
  );
}
