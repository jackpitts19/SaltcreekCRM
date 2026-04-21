"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CalendarDays, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  dueDate?: string | null;
  priority: "high" | "medium" | "low";
  contact?: { id: string; firstName: string; lastName: string } | null;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < today
  );
  const dueToday = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString()
  );
  const count = overdue.length + dueToday.length;

  useEffect(() => {
    fetch("/api/tasks?status=pending")
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">
              {count > 0
                ? `${count} task${count > 1 ? "s" : ""} need attention`
                : "No urgent tasks"}
            </p>
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
              You&apos;re all caught up!
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {overdue.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-xs font-semibold text-red-600 uppercase tracking-wide bg-red-50 border-b border-red-100">
                    Overdue · {overdue.length}
                  </p>
                  {overdue.map((t) => (
                    <TaskRow key={t.id} task={t} overdue onClick={() => setOpen(false)} />
                  ))}
                </>
              )}
              {dueToday.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-xs font-semibold text-orange-600 uppercase tracking-wide bg-orange-50 border-b border-orange-100">
                    Due Today · {dueToday.length}
                  </p>
                  {dueToday.map((t) => (
                    <TaskRow key={t.id} task={t} overdue={false} onClick={() => setOpen(false)} />
                  ))}
                </>
              )}
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <Link
              href="/tasks"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View all tasks →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  overdue,
  onClick,
}: {
  task: Task;
  overdue: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href="/tasks"
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
    >
      <CalendarDays
        size={14}
        className={`mt-0.5 flex-shrink-0 ${overdue ? "text-red-500" : "text-orange-500"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium truncate">{task.title}</p>
        {task.dueDate && (
          <p className={`text-xs mt-0.5 ${overdue ? "text-red-500" : "text-orange-600"}`}>
            {overdue ? "Overdue · " : "Due today · "}
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
        {task.contact && (
          <p className="text-xs text-slate-400 mt-0.5">
            {task.contact.firstName} {task.contact.lastName}
          </p>
        )}
      </div>
      <span
        className={`text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
          task.priority === "high"
            ? "bg-red-50 text-red-600"
            : task.priority === "medium"
            ? "bg-yellow-50 text-yellow-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {task.priority}
      </span>
    </Link>
  );
}
