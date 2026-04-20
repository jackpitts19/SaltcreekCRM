"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select, Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Phone, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, formatDuration } from "@/lib/utils";
import { useUser } from "@/lib/userContext";

interface CallLog {
  id: string; direction: string; duration: number | null; status: string;
  fromNumber: string | null; toNumber: string | null; notes: string | null;
  calledAt: string; recording: string | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  user: { id: string; name: string } | null;
}

export default function CallsPage() {
  const { currentUser } = useUser();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    direction: "outbound", duration: "", status: "completed",
    fromNumber: "", toNumber: "", notes: "", contactId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/calls");
    setCalls(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, userId: currentUser?.id ?? null }),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ direction: "outbound", duration: "", status: "completed", fromNumber: "", toNumber: "", notes: "", contactId: "" });
    load();
  }

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    no_answer: "bg-slate-100 text-slate-600",
    voicemail: "bg-purple-100 text-purple-700",
    busy: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Calls" subtitle={`${calls.length} calls logged`}
        action={{ label: "Log Call", onClick: () => setShowModal(true) }} />

      {/* Kixie banner */}
      <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-green-600" />
          <p className="text-sm text-green-800">
            <strong>Connect Kixie</strong> to automatically log calls and sync recordings
          </p>
        </div>
        <Link href="/settings" className="text-sm font-medium text-green-700 hover:text-green-900 border border-green-300 px-3 py-1 rounded-lg bg-white">
          Set up →
        </Link>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Direction</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Notes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Logged by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Loading...</td></tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Phone size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No calls logged yet</p>
                    <button onClick={() => setShowModal(true)} className="mt-2 text-blue-600 text-sm hover:underline">Log your first call</button>
                  </td>
                </tr>
              ) : calls.map((call) => (
                <tr key={call.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {call.contact ? (
                      <Link href={`/contacts/${call.contact.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {call.contact.firstName} {call.contact.lastName}
                      </Link>
                    ) : <span className="text-slate-400">Unknown</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      call.direction === "inbound" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {call.direction === "inbound" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                      {call.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[call.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {call.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDuration(call.duration)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                    {call.direction === "inbound" ? call.fromNumber : call.toNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatRelativeTime(call.calledAt)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{call.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{call.user?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Call" size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleLog} disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Log Call"}
            </button>
          </>
        }
      >
        <form onSubmit={handleLog} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Direction" value={form.direction} onChange={(e) => setForm({...form, direction: e.target.value})}
              options={[{ value: "outbound", label: "Outbound" }, { value: "inbound", label: "Inbound" }]} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}
              options={[
                { value: "completed", label: "Completed" },
                { value: "no_answer", label: "No Answer" },
                { value: "voicemail", label: "Voicemail" },
                { value: "busy", label: "Busy" },
                { value: "failed", label: "Failed" },
              ]} />
            <Input label="From Number" value={form.fromNumber} onChange={(e) => setForm({...form, fromNumber: e.target.value})} placeholder="+1 (555) 000-0000" />
            <Input label="To Number" value={form.toNumber} onChange={(e) => setForm({...form, toNumber: e.target.value})} placeholder="+1 (555) 000-0000" />
            <Input label="Duration (seconds)" type="number" value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} placeholder="180" />
          </div>
          <Textarea label="Call Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={4} placeholder="What was discussed..." />
        </form>
      </Modal>
    </div>
  );
}
