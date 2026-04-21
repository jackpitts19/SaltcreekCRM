"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  RefreshCw,
  CalendarDays,
  User,
  Building2,
  TrendingUp,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: "high" | "medium" | "low";
  status: "pending" | "done";
  completedAt?: string | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  company?: { id: string; name: string } | null;
  deal?: { id: string; name: string } | null;
}

interface Contact { id: string; firstName: string; lastName: string; }
interface Company { id: string; name: string; }
interface Deal { id: string; name: string; }

const PRIORITY_COLORS = {
  high: "bg-red-50 text-red-600",
  medium: "bg-yellow-50 text-yellow-700",
  low: "bg-slate-100 text-slate-500",
};

const emptyForm: {
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  contactId: string;
  companyId: string;
  dealId: string;
} = {
  title: "",
  description: "",
  dueDate: "",
  priority: "medium",
  contactId: "",
  companyId: "",
  dealId: "",
};

function TasksPage() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    const res = await fetch(`/api/tasks${params}`);
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-open modal when ?new=1 is in URL
  useEffect(() => {
    if (searchParams.get("new") === "1") openModal();
  }, []);

  async function openModal() {
    setForm(emptyForm);
    const [c, co, d] = await Promise.all([
      fetch("/api/contacts?limit=200").then((r) => r.json()),
      fetch("/api/companies?limit=200").then((r) => r.json()),
      fetch("/api/deals").then((r) => r.json()),
    ]);
    setContacts(Array.isArray(c) ? c : c.contacts ?? []);
    setCompanies(Array.isArray(co) ? co : co.companies ?? []);
    setDeals(Array.isArray(d) ? d : []);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        dueDate: form.dueDate || null,
        priority: form.priority,
        contactId: form.contactId || null,
        companyId: form.companyId || null,
        dealId: form.dealId || null,
      }),
    });
    setSaving(false);
    setShowModal(false);
    fetchTasks();
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "pending" ? "done" : "pending";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  }

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group pending tasks by due date bucket
  function groupTasks(list: Task[]) {
    if (filter !== "pending") return { "": list };
    const overdue: Task[] = [], todayTasks: Task[] = [], thisWeek: Task[] = [], later: Task[] = [], noDue: Task[] = [];
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + 7);
    list.forEach((t) => {
      if (!t.dueDate) { noDue.push(t); return; }
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      if (d < today) overdue.push(t);
      else if (d.getTime() === today.getTime()) todayTasks.push(t);
      else if (d < endOfWeek) thisWeek.push(t);
      else later.push(t);
    });
    const groups: Record<string, Task[]> = {};
    if (overdue.length) groups["Overdue"] = overdue;
    if (todayTasks.length) groups["Today"] = todayTasks;
    if (thisWeek.length) groups["This Week"] = thisWeek;
    if (later.length) groups["Later"] = later;
    if (noDue.length) groups["No Due Date"] = noDue;
    return groups;
  }

  const groups = groupTasks(tasks);
  const GROUP_COLORS: Record<string, string> = {
    Overdue: "text-red-600",
    Today: "text-orange-600",
    "This Week": "text-blue-600",
    Later: "text-slate-600",
    "No Due Date": "text-slate-400",
    "": "text-slate-600",
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Tasks"
        subtitle={`${pendingCount} pending`}
        action={{ label: "New Task", onClick: openModal }}
      />

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {(["pending", "all", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {f === "pending" ? "Pending" : f === "done" ? "Completed" : "All"}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle2 size={32} className="text-green-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">
              {filter === "pending" ? "No pending tasks — you're all caught up!" : "No tasks found."}
            </p>
            <button
              onClick={openModal}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              + Create a task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([groupName, groupTasks]) => (
              <div key={groupName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {groupName && (
                  <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${GROUP_COLORS[groupName]}`}>{groupName}</span>
                    <span className="text-xs text-slate-400">· {groupTasks.length}</span>
                  </div>
                )}
                <div className="divide-y divide-slate-100">
                  {groupTasks.map((task) => {
                    const isOverdue = task.status === "pending" && task.dueDate && new Date(task.dueDate) < today;
                    const isDueToday = task.status === "pending" && task.dueDate && new Date(task.dueDate).toDateString() === today.toDateString();
                    return (
                      <div key={task.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 group transition-colors">
                        <button onClick={() => toggleStatus(task)} className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-green-500 transition-colors">
                          {task.status === "done" ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {task.title}
                          </p>
                          {task.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {task.contact && (
                              <Link href={`/contacts/${task.contact.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <User size={11} /> {task.contact.firstName} {task.contact.lastName}
                              </Link>
                            )}
                            {task.company && (
                              <Link href={`/companies/${task.company.id}`} className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
                                <Building2 size={11} /> {task.company.name}
                              </Link>
                            )}
                            {task.deal && (
                              <Link href={`/deals/${task.deal.id}`} className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
                                <TrendingUp size={11} /> {task.deal.name}
                              </Link>
                            )}
                            {task.dueDate && filter !== "pending" && (
                              <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-medium" : isDueToday ? "text-orange-600 font-medium" : "text-slate-400"}`}>
                                <CalendarDays size={11} />
                                {isOverdue ? `Overdue · ${new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : isDueToday ? "Due today" : new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                          <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">New Task</h2>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Task title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as "high" | "medium" | "low" }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {contacts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Contact
                  </label>
                  <select
                    value={form.contactId}
                    onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">No contact</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {deals.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Deal
                  </label>
                  <select
                    value={form.dealId}
                    onChange={(e) => setForm((f) => ({ ...f, dealId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">No deal</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPageWrapper() {
  return (
    <Suspense>
      <TasksPage />
    </Suspense>
  );
}
