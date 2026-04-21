"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import {
  Mic,
  Monitor,
  Upload,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  ExternalLink,
  Video,
} from "lucide-react";

type Stage =
  | "setup"
  | "recording"
  | "transcribing"
  | "extracting"
  | "review"
  | "saving"
  | "saved";

type Source = "tab" | "mic" | "file";
type Priority = "high" | "medium" | "low";

interface Followup {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDays: number;
  include: boolean;
}

interface Contact { id: string; firstName: string; lastName: string; companyId?: string | null; company?: { id: string; name: string } | null; }
interface Company { id: string; name: string; }
interface Deal { id: string; name: string; }

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-slate-100 text-slate-500 border-slate-200",
};

// Transform a meeting URL to use the web client + pre-fill identity where supported
function getJoinUrl(url: string): string {
  const email = process.env.NEXT_PUBLIC_MEETING_USER_EMAIL ?? ""
  const name = process.env.NEXT_PUBLIC_MEETING_USER_NAME ?? ""
  try {
    const u = new URL(url)
    // Zoom: https://zoom.us/j/MEETING_ID or https://*.zoom.us/j/MEETING_ID
    if (u.hostname.includes("zoom.us") && u.pathname.startsWith("/j/")) {
      const meetingId = u.pathname.replace("/j/", "").split("?")[0]
      const pwd = u.searchParams.get("pwd") ?? ""
      const webUrl = new URL(`https://zoom.us/wc/${meetingId}/join`)
      if (pwd) webUrl.searchParams.set("pwd", pwd)
      webUrl.searchParams.set("prefer", "1")
      if (email) webUrl.searchParams.set("email", email)
      if (name) webUrl.searchParams.set("uname", name)
      return webUrl.toString()
    }
    // Google Meet, Teams, Webex — open as-is (identity comes from logged-in account)
    return url
  } catch {
    return url
  }
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MeetingRecordPage() {
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("setup");
  const [source, setSource] = useState<Source>("tab");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [contactId, setContactId] = useState(searchParams.get("contactId") ?? "");
  const [companyId, setCompanyId] = useState("");
  const [dealId, setDealId] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load CRM entities
  useEffect(() => {
    Promise.all([
      fetch("/api/contacts?limit=200").then((r) => r.json()),
      fetch("/api/companies?limit=200").then((r) => r.json()),
      fetch("/api/deals").then((r) => r.json()),
    ]).then(([c, co, d]) => {
      setContacts(Array.isArray(c) ? c : c.contacts ?? []);
      setCompanies(Array.isArray(co) ? co : co.companies ?? []);
      setDeals(Array.isArray(d) ? d : []);
    });
  }, []);

  // Timer
  useEffect(() => {
    if (stage === "recording") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  const processAudio = useCallback(async (blob: Blob) => {
    setStage("transcribing");
    setError("");

    try {
      // Transcribe
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const transcribeRes = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { transcript: text } = await transcribeRes.json();
      setTranscript(text);

      // Extract follow-ups
      setStage("extracting");
      const extractRes = await fetch("/api/ai/extract-followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, meetingTitle }),
      });
      if (!extractRes.ok) throw new Error("Extraction failed");
      const { summary: sum, followups: fups } = await extractRes.json();
      setSummary(sum);
      setFollowups(
        (fups as Omit<Followup, "id" | "include">[]).map((f, i) => ({
          ...f,
          id: String(i),
          include: true,
          description: f.description ?? "",
          priority: (f.priority ?? "medium") as Priority,
          dueDays: f.dueDays ?? 7,
        }))
      );
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("setup");
    }
  }, [meetingTitle]);

  async function startRecording() {
    setError("");
    setElapsed(0);
    chunksRef.current = [];

    try {
      let stream: MediaStream;
      if (source === "tab") {
        const display = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        // Drop video tracks — we only want audio
        display.getVideoTracks().forEach((t) => t.stop());
        stream = new MediaStream(display.getAudioTracks());
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(blob);
      };

      recorder.start(1000);
      setStage("recording");
    } catch (e) {
      setError(
        source === "tab"
          ? "Screen sharing was denied or no audio source selected. Make sure to check 'Share tab audio' in the dialog."
          : "Microphone access was denied."
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processAudio(file);
  }

  async function handleSave() {
    setStage("saving");
    const selected = followups.filter((f) => f.include);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingTitle: meetingTitle || "Untitled Meeting",
        transcript,
        summary,
        followups: selected.map(({ title, description, priority, dueDays }) => ({
          title,
          description,
          priority,
          dueDays,
        })),
        contactId: contactId || null,
        companyId: companyId || null,
        dealId: dealId || null,
      }),
    });
    const data = await res.json();
    setSavedCount(data.tasks?.length ?? 0);
    setStage("saved");
  }

  async function joinAndRecord() {
    if (meetingUrl) {
      window.open(getJoinUrl(meetingUrl), "_blank", "noopener,noreferrer");
      // Brief pause so the tab opens before the browser dialog appears
      await new Promise((r) => setTimeout(r, 800));
    }
    setSource("tab");
    startRecording();
  }

  function reset() {
    setStage("setup");
    setMeetingTitle("");
    setMeetingUrl("");
    setContactId("");
    setCompanyId("");
    setDealId("");
    setTranscript("");
    setSummary("");
    setFollowups([]);
    setElapsed(0);
    setError("");
    setShowTranscript(false);
  }

  // ─── Saved state ────────────────────────────────────────────────────────────
  if (stage === "saved") {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Meeting Recorder" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Saved!</h2>
            <p className="text-slate-500 text-sm mb-1">
              Meeting notes added to the contact record.
            </p>
            {savedCount > 0 && (
              <p className="text-slate-500 text-sm mb-6">
                {savedCount} follow-up task{savedCount > 1 ? "s" : ""} created.
              </p>
            )}
            <button
              onClick={reset}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Record Another Meeting
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading states ──────────────────────────────────────────────────────────
  if (stage === "transcribing" || stage === "extracting" || stage === "saving") {
    const label =
      stage === "transcribing"
        ? "Transcribing audio…"
        : stage === "extracting"
        ? "Extracting follow-ups with AI…"
        : "Saving to CRM…";
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Meeting Recorder" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 size={36} className="text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 font-medium">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Review state ────────────────────────────────────────────────────────────
  if (stage === "review") {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Meeting Recorder" />
        <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-5">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">AI Summary</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{summary || "No summary generated."}</p>
          </div>

          {/* Follow-ups */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Follow-up Tasks ({followups.filter((f) => f.include).length} selected)
              </h2>
            </div>

            {followups.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">No follow-up tasks identified.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {followups.map((f) => (
                  <div key={f.id} className={`px-5 py-4 flex gap-3 ${!f.include ? "opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      checked={f.include}
                      onChange={(e) =>
                        setFollowups((prev) =>
                          prev.map((item) =>
                            item.id === f.id ? { ...item, include: e.target.checked } : item
                          )
                        )
                      }
                      className="mt-1 h-4 w-4 accent-blue-600 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={f.title}
                        onChange={(e) =>
                          setFollowups((prev) =>
                            prev.map((item) =>
                              item.id === f.id ? { ...item, title: e.target.value } : item
                            )
                          )
                        }
                        className="w-full text-sm font-medium text-slate-800 border-0 border-b border-transparent focus:border-blue-400 focus:outline-none bg-transparent pb-0.5"
                      />
                      <div className="flex items-center gap-3 flex-wrap">
                        <select
                          value={f.priority}
                          onChange={(e) =>
                            setFollowups((prev) =>
                              prev.map((item) =>
                                item.id === f.id
                                  ? { ...item, priority: e.target.value as Priority }
                                  : item
                              )
                            )
                          }
                          className={`text-xs font-medium px-2 py-0.5 rounded border ${PRIORITY_COLORS[f.priority]} focus:outline-none`}
                        >
                          <option value="high">high</option>
                          <option value="medium">medium</option>
                          <option value="low">low</option>
                        </select>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar size={11} />
                          Due in{" "}
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={f.dueDays}
                            onChange={(e) =>
                              setFollowups((prev) =>
                                prev.map((item) =>
                                  item.id === f.id
                                    ? { ...item, dueDays: Number(e.target.value) }
                                    : item
                                )
                              )
                            }
                            className="w-10 text-center text-xs border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />{" "}
                          days
                        </span>
                        <button
                          onClick={() =>
                            setFollowups((prev) => prev.filter((item) => item.id !== f.id))
                          }
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transcript toggle */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowTranscript((v) => !v)}
              className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Full Transcript</span>
              {showTranscript ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showTranscript && (
              <div className="px-5 pb-5 max-h-64 overflow-y-auto">
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Save to CRM
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Setup + Recording ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Meeting Recorder" subtitle="Record, transcribe & extract action items" />

      <div className="flex-1 p-6 max-w-xl mx-auto w-full space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Meeting info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Meeting Details</h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Meeting Title
            </label>
            <input
              type="text"
              placeholder="e.g. Q2 Portfolio Review with Acme Capital"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              disabled={stage === "recording"}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Meeting URL <span className="text-slate-400 font-normal">(optional — Google Meet, Zoom, Teams)</span>
            </label>
            <input
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              disabled={stage === "recording"}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Contact</label>
              <select
                value={contactId}
                onChange={(e) => {
                  const id = e.target.value;
                  setContactId(id);
                  if (id) {
                    const c = contacts.find((c) => c.id === id);
                    if (c?.company) setCompanyId(c.company.id);
                  }
                }}
                disabled={stage === "recording"}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
              >
                <option value="">None</option>
                {(companyId
                  ? contacts.filter((c) => c.company?.id === companyId || c.companyId === companyId)
                  : contacts
                ).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Company</label>
              <select
                value={companyId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCompanyId(id);
                  // Clear contact if it doesn't belong to the newly selected company
                  if (id && contactId) {
                    const c = contacts.find((c) => c.id === contactId);
                    if (c?.company?.id !== id && c?.companyId !== id) setContactId("");
                  }
                }}
                disabled={stage === "recording"}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
              >
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Deal</label>
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                disabled={stage === "recording"}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
              >
                <option value="">None</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Source selector + recorder */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          {stage !== "recording" && (
            <>
              <h2 className="text-sm font-semibold text-slate-900">Audio Source</h2>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "tab", icon: Monitor, label: "Tab / Screen", hint: "Share call audio" },
                    { id: "mic", icon: Mic, label: "Microphone", hint: "In-person meeting" },
                    { id: "file", icon: Upload, label: "Upload File", hint: "Existing recording" },
                  ] as const
                ).map(({ id, icon: Icon, label, hint }) => (
                  <button
                    key={id}
                    onClick={() => setSource(id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-colors ${
                      source === id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium leading-tight">{label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Recording active */}
          {stage === "recording" ? (
            <div className="flex flex-col items-center py-4 gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-2xl font-mono font-semibold text-slate-800">
                  {formatTime(elapsed)}
                </span>
              </div>
              <p className="text-sm text-slate-500">Recording in progress…</p>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Square size={14} fill="white" />
                Stop Recording
              </button>
            </div>
          ) : source === "file" ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Upload size={16} />
                Click to select audio or video file
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {source === "tab" && meetingUrl ? (
                // Join & Record — opens meeting URL then starts tab capture
                <button
                  onClick={joinAndRecord}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-medium rounded-xl transition-colors bg-violet-600 hover:bg-violet-700"
                >
                  <Video size={16} />
                  Join &amp; Record
                  <ExternalLink size={13} className="opacity-70" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-medium rounded-xl transition-colors ${
                    source === "tab"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {source === "tab" ? (
                    <>
                      <Monitor size={16} />
                      Share Tab &amp; Start Recording
                    </>
                  ) : (
                    <>
                      <Mic size={16} />
                      Start Recording
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {source === "tab" && stage !== "recording" && (
            <p className="text-xs text-slate-400 text-center">
              {meetingUrl
                ? "Opens your meeting in a new tab, then asks you to select it for recording."
                : "A screen-sharing dialog will open. Select the browser tab with your call and enable \u201cShare tab audio\u201d."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
