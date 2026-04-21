"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select, Textarea } from "@/components/ui/Input";
import { formatCurrency, DEAL_STAGES, DEAL_TYPES, LEAD_SOURCES, getDealType, getDealStage } from "@/lib/utils";
import Link from "next/link";
import { Building2, Plus, User, AlertCircle, Clock, Trash2 } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/lib/toast";

interface Deal {
  id: string;
  name: string;
  stage: string;
  dealType: string;
  value: number | null;
  createdAt: string;
  expectedCloseDate: string | null;
  company: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  contacts: Array<{ contact: { id: string; firstName: string; lastName: string; title: string | null } }>;
  _count: { notes: number; activities: number };
}

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  company: { id: string; name: string } | null;
}

interface CompanyOption {
  id: string;
  name: string;
}

const ACTIVE_STAGES = DEAL_STAGES.filter(
  (s) => s.id !== "closed_won" && s.id !== "closed_lost"
);

export default function DealsPage() {
  const { currentUser } = useUser();
  const toast = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const [form, setForm] = useState({
    name: "", dealType: "ma_sellside", stage: "prospect",
    value: "", expectedCloseDate: "",
    description: "", companyId: "", source: "",
    contactId: "",
  });

  const searchParams = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/deals");
    setDeals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") openModal();
  }, []);

  async function openModal(stageId?: string) {
    // Fetch contacts and companies for pickers
    const [cRes, coRes] = await Promise.all([
      fetch("/api/contacts?limit=500"),
      fetch("/api/companies?limit=500"),
    ]);
    setContacts(await cRes.json());
    setCompanies(await coRes.json());
    setForm((f) => ({ ...f, stage: stageId ?? "prospect" }));
    setShowModal(true);
  }

  function handleContactChange(contactId: string) {
    const contact = contacts.find((c) => c.id === contactId);
    setForm((f) => ({
      ...f,
      contactId,
      companyId: contact?.company?.id ?? f.companyId,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, assignedToId: currentUser?.id ?? null }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to create deal");
      return;
    }
    setShowModal(false);
    setForm({ name: "", dealType: "ma_sellside", stage: "prospect",
      value: "", expectedCloseDate: "", description: "", companyId: "", source: "", contactId: "" });
    toast.success(`Deal "${form.name}" created`);
    load();
  }

  async function handleDeleteDeal(dealId: string, dealName: string) {
    if (!confirm(`Delete "${dealName}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete deal"); return; }
    toast.success(`"${dealName}" deleted`);
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
  }

  async function moveToStage(dealId: string, newStage: string) {
    await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage } : d));
  }

  const dealsByStage = (stageId: string) => deals.filter((d) => d.stage === stageId);
  const stageValue = (stageId: string) => dealsByStage(stageId).reduce((sum, d) => sum + (d.value ?? 0), 0);

  function handleDragStart(e: React.DragEvent, dealId: string) {
    e.dataTransfer.setData("dealId", dealId);
    setDragging(dealId);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOverStage(null);
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (dealId) moveToStage(dealId, stageId);
    setDragOverStage(null);
    setDragging(null);
  }

  const selectedContact = contacts.find((c) => c.id === form.contactId);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Pipeline"
        subtitle={`${deals.length} open deals · ${formatCurrency(deals.reduce((s, d) => s + (d.value ?? 0), 0))} total value`}
        action={{ label: "New Deal", onClick: () => openModal() }}
      />

      {/* View Toggle */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button onClick={() => setViewMode("kanban")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "kanban" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            Kanban
          </button>
          <button onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            List
          </button>
        </div>
        <div className="flex gap-2 ml-auto text-sm">
          <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium text-xs">
            {deals.filter((d) => d.stage === "closed_won").length} Won
          </span>
          <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-medium text-xs">
            {deals.filter((d) => d.stage === "closed_lost").length} Lost
          </span>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 min-w-max">
            {ACTIVE_STAGES.map((stage) => {
              const stageDeals = dealsByStage(stage.id);
              const isOver = dragOverStage === stage.id;
              return (
                <div key={stage.id}
                  className={`w-64 flex flex-col rounded-xl border-2 transition-colors ${isOver ? "border-blue-400 bg-blue-50" : "border-transparent"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  onDragLeave={() => setDragOverStage(null)}>

                  {/* Column Header */}
                  <div className="px-3 py-2.5 rounded-t-xl sticky top-0 z-10 bg-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-xs font-semibold text-slate-700">{stage.label}</span>
                      </div>
                      <span className="text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{formatCurrency(stageValue(stage.id))}</p>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 min-h-32">
                    {stageDeals.map((deal) => {
                      const ageDays = Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / 86_400_000);
                      const closeDate = deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null;
                      const now = new Date();
                      const closeOverdue = closeDate && closeDate < now;
                      const closeSoon = closeDate && !closeOverdue && (closeDate.getTime() - now.getTime()) < 7 * 86_400_000;
                      return (
                        <div key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-lg border p-3 cursor-grab hover:shadow-md transition-all group ${
                            dragging === deal.id ? "opacity-40 shadow-lg" : closeOverdue ? "border-red-200 hover:border-red-300" : "border-slate-200 hover:border-blue-300"
                          }`}>
                          <Link href={`/deals/${deal.id}`} className="block" onClick={(e) => dragging && e.preventDefault()}>
                            <p className="text-sm font-semibold text-slate-900 leading-snug mb-1.5 group-hover:text-blue-600 transition-colors">
                              {deal.name}
                            </p>
                            {deal.company && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                                <Building2 size={10} /> {deal.company.name}
                              </p>
                            )}
                            {deal.contacts.length > 0 && (
                              <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                                <User size={10} />
                                {deal.contacts[0].contact.firstName} {deal.contacts[0].contact.lastName}
                                {deal.contacts.length > 1 && ` +${deal.contacts.length - 1}`}
                              </p>
                            )}
                            {closeOverdue && (
                              <p className="text-xs text-red-500 flex items-center gap-1 mb-1">
                                <AlertCircle size={10} /> Close date passed
                              </p>
                            )}
                            {closeSoon && (
                              <p className="text-xs text-amber-600 flex items-center gap-1 mb-1">
                                <Clock size={10} /> Due {closeDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                              <span className="text-xs font-bold text-slate-700">{formatCurrency(deal.value)}</span>
                              <div className="flex items-center gap-1.5">
                                {ageDays >= 60 && (
                                  <span className={`text-xs font-medium ${ageDays >= 90 ? "text-red-500" : "text-amber-500"}`}>{ageDays}d</span>
                                )}
                                <span className="text-xs text-slate-400">{getDealType(deal.dealType).label.replace("M&A ", "")}</span>
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}

                    {stageDeals.length === 0 && (
                      <div className="text-center py-6 text-slate-300 text-xs border-2 border-dashed border-slate-200 rounded-lg">
                        Drop here
                      </div>
                    )}
                  </div>

                  {/* Add button */}
                  <div className="p-2">
                    <button onClick={() => openModal(stage.id)}
                      className="w-full py-1.5 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <Plus size={12} /> Add deal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Deal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contacts</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Owner</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((deal) => {
                  const stage = getDealStage(deal.stage);
                  const type = getDealType(deal.dealType);
                  return (
                    <tr key={deal.id} className="group hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/deals/${deal.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                          {deal.name}
                        </Link>
                        {deal.company && <p className="text-xs text-slate-500">{deal.company.name}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{type.label}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: stage.color + "20", color: stage.color }}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(deal.value)}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {deal.contacts.map((dc) => `${dc.contact.firstName} ${dc.contact.lastName}`).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{deal.assignedTo?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteDeal(deal.id, deal.name)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete deal"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {deals.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">No deals yet. Add your first deal.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Deal" size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Create Deal"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <Input
            label="Deal Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="col-span-2"
            placeholder="e.g. Acme Corp Sell-side"
          />

          <Select label="Deal Type" value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}
            options={DEAL_TYPES.map((t) => ({ value: t.id, label: t.label }))} />

          <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
            options={DEAL_STAGES.map((s) => ({ value: s.id, label: s.label }))} />

          {/* Contact picker */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Contact</label>
            <select
              value={form.contactId}
              onChange={(e) => handleContactChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="">Select contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}{c.company ? ` — ${c.company.name}` : ""}
                </option>
              ))}
            </select>
            {selectedContact?.company && (
              <p className="text-xs text-slate-400 mt-1">Company auto-linked: {selectedContact.company.name}</p>
            )}
          </div>

          {/* Company override */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Company {form.contactId ? "(auto-set from contact)" : ""}</label>
            <select
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Input label="Deal Size ($M)" type="number" placeholder="5" value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })} />

          <Input label="Expected Close Date" type="date" value={form.expectedCloseDate}
            onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />

          <Select label="Lead Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[{ value: "", label: "Select source..." }, ...LEAD_SOURCES.map(s => ({ value: s.id, label: s.label }))]}
            className="col-span-2"
          />

          <Textarea label="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3} className="col-span-2" />
        </form>
      </Modal>
    </div>
  );
}
