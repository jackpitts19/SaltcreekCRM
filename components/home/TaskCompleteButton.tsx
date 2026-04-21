"use client";

import { useState } from "react";
import { Circle, CheckCircle2 } from "lucide-react";

export default function TaskCompleteButton({ taskId }: { taskId: string }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function complete() {
    if (done || loading) return;
    setLoading(true);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />;
  }

  return (
    <button
      onClick={complete}
      disabled={loading}
      className="flex-shrink-0 mt-0.5 text-slate-300 hover:text-green-500 transition-colors disabled:opacity-50"
      title="Mark complete"
    >
      <Circle size={18} />
    </button>
  );
}
