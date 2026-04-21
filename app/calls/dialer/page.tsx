"use client";

import { useState, useEffect, useRef } from "react";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  SkipForward,
  CheckCircle2,
  Clock,
  User,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  Mic,
} from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  company?: { id: string; name: string } | null;
}

type CallState = "idle" | "calling" | "connected" | "logged";

type Outcome = "answered" | "voicemail" | "no-answer" | "not-interested" | "callback";

const OUTCOMES: { value: Outcome; label: string; icon: React.ElementType; color: string }[] = [
  { value: "answered", label: "Answered", icon: PhoneCall, color: "bg-green-600 hover:bg-green-700" },
  { value: "voicemail", label: "Voicemail", icon: Voicemail, color: "bg-blue-600 hover:bg-blue-700" },
  { value: "no-answer", label: "No Answer", icon: PhoneMissed, color: "bg-slate-500 hover:bg-slate-600" },
  { value: "not-interested", label: "Not Interested", icon: PhoneOff, color: "bg-red-600 hover:bg-red-700" },
  { value: "callback", label: "Schedule Callback", icon: RotateCcw, color: "bg-orange-500 hover:bg-orange-600" },
];

export default function PowerDialerPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [queue, setQueue] = useState<Contact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [callState, setCallState] = useState<CallState>("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionStats, setSessionStats] = useState({ called: 0, answered: 0, voicemail: 0, skipped: 0 });
  const [started, setStarted] = useState(false);
  const [filter, setFilter] = useState("");
  const [smsText, setSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [showSmsPanel, setShowSmsPanel] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/contacts?limit=500")
      .then((r) => r.json())
      .then((data) => {
        const list: Contact[] = Array.isArray(data) ? data : data.contacts ?? [];
        // Only contacts with a phone number
        const withPhone = list.filter((c) => c.phone || c.mobile);
        setContacts(withPhone);
        setQueue(withPhone);
      });
  }, []);

  useEffect(() => {
    if (callState === "calling") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const current = queue[currentIndex] ?? null;

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  }

  async function dial() {
    if (!current) return;
    const phone = current.phone || current.mobile;
    if (!phone) return;
    setError("");
    setCallState("calling");
    setOutcome(null);
    setNotes("");

    const res = await fetch("/api/dialer/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactPhone: phone.replace(/\D/g, ""),
        contactId: current.id,
        contactName: `${current.firstName} ${current.lastName}`,
      }),
    });

    if (!res.ok) {
      setCallState("idle");
      setError("Failed to initiate call. Check your Twilio credentials.");
    } else {
      setCallState("connected");
    }
  }

  async function logAndAdvance(selectedOutcome: Outcome) {
    if (!current) return;
    setSaving(true);
    setOutcome(selectedOutcome);

    await fetch("/api/dialer/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: current.id,
        outcome: selectedOutcome,
        notes,
        duration: elapsed,
      }),
    });

    setSaving(false);
    setCallState("logged");
    setSessionStats((s) => ({
      ...s,
      called: s.called + 1,
      answered: selectedOutcome === "answered" ? s.answered + 1 : s.answered,
      voicemail: selectedOutcome === "voicemail" ? s.voicemail + 1 : s.voicemail,
    }));
  }

  function next() {
    setCallState("idle");
    setOutcome(null);
    setNotes("");
    setElapsed(0);
    setSmsText("");
    setShowSmsPanel(false);
    setCurrentIndex((i) => i + 1);
  }

  function skip() {
    setSessionStats((s) => ({ ...s, skipped: s.skipped + 1 }));
    next();
  }

  async function sendSms(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !smsText.trim()) return;
    const toPhone = current.phone || current.mobile;
    if (!toPhone) return;
    setSendingSms(true);
    await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: current.id, toPhone, body: smsText }),
    });
    setSendingSms(false);
    setSmsText("");
    setShowSmsPanel(false);
  }

  const filtered = contacts.filter((c) =>
    filter
      ? `${c.firstName} ${c.lastName} ${c.company?.name ?? ""}`.toLowerCase().includes(filter.toLowerCase())
      : true
  );

  // ─── Pre-start: contact list picker ─────────────────────────────────────────
  if (!started) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Power Dialer" subtitle={`${contacts.length} contacts with phone numbers`} />
        <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Your Queue</h2>
            <p className="text-xs text-slate-500">
              These are all contacts with a phone number. Reorder or remove before starting.
            </p>
            <input
              type="text"
              placeholder="Filter contacts..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No contacts with phone numbers found.</p>
            ) : (
              filtered.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-slate-300 w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-slate-400">{c.company?.name ?? ""} · {c.phone || c.mobile}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => { setQueue(filtered); setStarted(true); setCurrentIndex(0); }}
            disabled={filtered.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <Phone size={16} />
            Start Dialing {filtered.length > 0 ? `(${filtered.length} contacts)` : ""}
          </button>
        </div>
      </div>
    );
  }

  // ─── Done ────────────────────────────────────────────────────────────────────
  if (currentIndex >= queue.length) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Power Dialer" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm space-y-4">
            <CheckCircle2 size={48} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-slate-900">Queue Complete!</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-slate-900">{sessionStats.called}</p>
                <p className="text-slate-500 text-xs mt-0.5">Calls Made</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{sessionStats.answered}</p>
                <p className="text-slate-500 text-xs mt-0.5">Answered</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{sessionStats.voicemail}</p>
                <p className="text-slate-500 text-xs mt-0.5">Voicemails</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-slate-500">{sessionStats.skipped}</p>
                <p className="text-slate-500 text-xs mt-0.5">Skipped</p>
              </div>
            </div>
            <button
              onClick={() => { setStarted(false); setCurrentIndex(0); setSessionStats({ called: 0, answered: 0, voicemail: 0, skipped: 0 }); }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Start New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active dialer ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Power Dialer" subtitle={`${currentIndex + 1} of ${queue.length}`} />

      <div className="flex-1 p-6 max-w-xl mx-auto w-full space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Session stats bar */}
        <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-2">
          <span>Called: <strong className="text-slate-700">{sessionStats.called}</strong></span>
          <span>Answered: <strong className="text-green-600">{sessionStats.answered}</strong></span>
          <span>VM: <strong className="text-blue-600">{sessionStats.voicemail}</strong></span>
          <span>Skipped: <strong className="text-slate-500">{sessionStats.skipped}</strong></span>
          <span className="ml-auto">{queue.length - currentIndex} remaining</span>
        </div>

        {/* Contact card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-semibold text-lg">
                {current.firstName[0]}{current.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900">
                {current.firstName} {current.lastName}
              </h2>
              {current.title && <p className="text-sm text-slate-500">{current.title}</p>}
              {current.company && (
                <Link href={`/companies/${current.company.id}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-0.5">
                  <Building2 size={12} />
                  {current.company.name}
                </Link>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Phone size={13} className="text-slate-400" />
                <span className="text-sm font-mono text-slate-700">{current.phone || current.mobile}</span>
              </div>
            </div>
            <Link href={`/contacts/${current.id}`} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>

        {/* Call controls */}
        {callState === "idle" && (
          <div className="space-y-2">
            <div className="flex gap-3">
              <button
                onClick={dial}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Phone size={18} />
                Call {current.firstName}
              </button>
              <button
                onClick={() => setShowSmsPanel((v) => !v)}
                className="px-4 py-3.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl transition-colors"
                title="Send Text"
              >
                <MessageSquare size={18} />
              </button>
              <button
                onClick={skip}
                className="px-4 py-3.5 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Skip"
              >
                <SkipForward size={18} />
              </button>
            </div>
            {showSmsPanel && (
              <form onSubmit={sendSms} className="flex gap-2">
                <input
                  type="text"
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  placeholder={`Text ${current.firstName}...`}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={sendingSms || !smsText.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {sendingSms ? "…" : "Send"}
                </button>
              </form>
            )}
          </div>
        )}

        {callState === "calling" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-blue-500 mx-auto" />
            <p className="text-sm font-medium text-slate-700">Connecting your phone…</p>
            <p className="text-xs text-slate-400">Your phone (+1 708-205-2788) will ring first, then connect to {current.firstName}.</p>
          </div>
        )}

        {callState === "connected" && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-800">Call in progress</span>
              </div>
              <span className="text-sm font-mono text-green-700">{formatTime(elapsed)}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Call Notes</label>
              <textarea
                placeholder="What was discussed..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <p className="text-xs font-medium text-slate-600 mb-2">Log outcome:</p>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => logAndAdvance(value)}
                  disabled={saving}
                  className={`flex items-center justify-center gap-2 py-2.5 text-white text-sm font-medium rounded-xl transition-colors ${color} disabled:opacity-50`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {callState === "logged" && (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Logged as <strong>{outcome}</strong></p>
                {notes && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{notes}</p>}
              </div>
            </div>

            {/* Quick follow-up text */}
            <form onSubmit={sendSms} className="flex gap-2">
              <input
                type="text"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder={`Send a follow-up text to ${current.firstName}...`}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={sendingSms || !smsText.trim()}
                className="flex items-center gap-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                <MessageSquare size={13} />
                {sendingSms ? "…" : "Text"}
              </button>
            </form>

            {/* Record this call in Meeting Recorder */}
            <Link
              href={`/meetings/record?contactId=${current.id}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium rounded-xl transition-colors border border-violet-200"
            >
              <Mic size={14} />
              Open Meeting Recorder for {current.firstName}
            </Link>

            <button
              onClick={next}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Next Contact <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Up next preview */}
        {queue[currentIndex + 1] && (
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400">Up next:</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-600 truncate">
                {queue[currentIndex + 1].firstName} {queue[currentIndex + 1].lastName}
              </p>
              {queue[currentIndex + 1].company && (
                <p className="text-xs text-slate-400 truncate">{queue[currentIndex + 1].company?.name}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
