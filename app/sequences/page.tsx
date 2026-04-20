"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select, Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import { Zap, Mail, Phone, Users, Plus, Trash2, CheckCircle, MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface SequenceStep {
  id?: string; stepNumber: number; type: string; delayDays: number;
  subject?: string; body?: string; taskNote?: string;
}

interface Sequence {
  id: string; name: string; description: string | null; status: string;
  createdAt: string;
  steps: SequenceStep[];
  _count: { enrollments: number };
}

const stepTypeIcons: Record<string, React.ReactNode> = {
  email: <Mail size={13} className="text-blue-600" />,
  call: <Phone size={13} className="text-green-600" />,
  linkedin: <Users size={13} className="text-indigo-600" />,
  task: <CheckCircle size={13} className="text-slate-600" />,
};

const stepTypeColors: Record<string, string> = {
  email: "bg-blue-100",
  call: "bg-green-100",
  linkedin: "bg-indigo-100",
  task: "bg-slate-100",
};

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSeq, setSelectedSeq] = useState<Sequence | null>(null);

  const [form, setForm] = useState({ name: "", description: "", status: "active" });
  const [steps, setSteps] = useState<SequenceStep[]>([
    { stepNumber: 1, type: "email", delayDays: 0, subject: "", body: "" },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sequences");
    setSequences(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function addStep() {
    setSteps((prev) => [...prev, {
      stepNumber: prev.length + 1, type: "email", delayDays: 1, subject: "", body: "",
    }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  }

  function updateStep(i: number, data: Partial<SequenceStep>) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, ...data } : s));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, steps }),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ name: "", description: "", status: "active" });
    setSteps([{ stepNumber: 1, type: "email", delayDays: 0, subject: "", body: "" }]);
    load();
  }

  async function toggleStatus(seq: Sequence) {
    const newStatus = seq.status === "active" ? "paused" : "active";
    await fetch(`/api/sequences/${seq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Sequences" subtitle="Email cadences and outreach automation"
        action={{ label: "New Sequence", onClick: () => setShowModal(true) }} />

      <div className="p-6">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading...</div>
        ) : sequences.length === 0 ? (
          <div className="py-16 text-center">
            <Zap size={40} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No sequences yet</p>
            <p className="text-slate-400 text-sm mt-1">Create automated outreach cadences for your contacts</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Create your first sequence
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sequences.map((seq) => (
              <div key={seq.id} className={`bg-white rounded-xl border-2 transition-colors cursor-pointer ${selectedSeq?.id === seq.id ? "border-blue-400" : "border-slate-200 hover:border-slate-300"}`}
                onClick={() => setSelectedSeq(selectedSeq?.id === seq.id ? null : seq)}>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">{seq.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${seq.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                          {seq.status}
                        </span>
                      </div>
                      {seq.description && <p className="text-sm text-slate-500 mt-1">{seq.description}</p>}

                      {/* Step Pills */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {seq.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-slate-300 text-xs">
                                +{step.delayDays}d →
                              </span>
                            )}
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stepTypeColors[step.type] ?? "bg-slate-100"}`}>
                              {stepTypeIcons[step.type]}
                              {step.type}
                              {step.subject && `: "${step.subject.slice(0, 20)}${step.subject.length > 20 ? "..." : ""}"`}
                            </span>
                          </div>
                        ))}
                        {seq.steps.length === 0 && <span className="text-xs text-slate-400">No steps configured</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">{seq._count.enrollments}</p>
                        <p className="text-xs text-slate-500">enrolled</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">{seq.steps.length}</p>
                        <p className="text-xs text-slate-500">steps</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleStatus(seq); }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          seq.status === "active"
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}>
                        {seq.status === "active" ? "Pause" : "Resume"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded step details */}
                {selectedSeq?.id === seq.id && (
                  <div className="border-t border-slate-100 p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Step Details</h4>
                    <div className="space-y-3">
                      {seq.steps.map((step, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${stepTypeColors[step.type] ?? "bg-slate-100"}`}>
                            {stepTypeIcons[step.type]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-700">Step {step.stepNumber}</span>
                              <span className="text-xs text-slate-400">
                                {step.delayDays === 0 ? "Immediately" : `+${step.delayDays} day${step.delayDays !== 1 ? "s" : ""}`}
                              </span>
                            </div>
                            {step.subject && <p className="text-sm font-medium text-slate-800 mt-0.5">{step.subject}</p>}
                            {step.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{step.body}</p>}
                            {step.taskNote && <p className="text-xs text-slate-600 mt-0.5">{step.taskNote}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Sequence" size="xl"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Create Sequence"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sequence Name" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. M&A Initial Outreach" />
            <Select label="Status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}
              options={[{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }]} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} placeholder="What is this sequence for?" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Steps</h3>
              <button type="button" onClick={addStep}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                <Plus size={12} /> Add Step
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Step {step.stepNumber}</span>
                    {steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Select label="Type" value={step.type} onChange={(e) => updateStep(i, { type: e.target.value })}
                      options={[{ value: "email", label: "Email" }, { value: "call", label: "Call" }, { value: "linkedin", label: "LinkedIn" }, { value: "task", label: "Task" }]} />
                    <div className="col-span-2">
                      <Input label={i === 0 ? "Send immediately" : "Delay (days after previous)"}
                        type="number" min="0" value={String(step.delayDays)}
                        onChange={(e) => updateStep(i, { delayDays: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  {step.type === "email" && (
                    <>
                      <Input label="Email Subject" value={step.subject ?? ""} onChange={(e) => updateStep(i, { subject: e.target.value })} placeholder="e.g. Introduction from [Your Name]" />
                      <Textarea label="Email Body" value={step.body ?? ""} onChange={(e) => updateStep(i, { body: e.target.value })} rows={4}
                        placeholder="Hi {{firstName}}, I wanted to reach out about..." />
                    </>
                  )}
                  {(step.type === "call" || step.type === "linkedin" || step.type === "task") && (
                    <Textarea label="Notes / Task Description" value={step.taskNote ?? ""} onChange={(e) => updateStep(i, { taskNote: e.target.value })} rows={2} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
