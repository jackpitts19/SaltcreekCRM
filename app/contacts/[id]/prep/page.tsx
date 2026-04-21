"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ChevronLeft, Sparkles, Phone, Mail, Building2, FileText,
  MessageSquare, AlertTriangle, Target, Clock, RefreshCw, Copy, Check
} from "lucide-react";
import { formatDate, formatRelativeTime, formatDuration, getDealStage } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface PrepData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedinUrl: string | null;
  status: string;
  tags: string;
  lastContactedAt: string | null;
  company: {
    id: string;
    name: string;
    industry: string | null;
    subIndustry: string | null;
    description: string | null;
    hqLocation: string | null;
    employeeCount: number | null;
    revenue: number | null;
    website: string | null;
    linkedinUrl: string | null;
  } | null;
  notes: Array<{
    id: string;
    content: string;
    source: string;
    meetingTitle: string | null;
    meetingDate: string | null;
    transcript: string | null;
    isPinned: boolean;
    createdAt: string;
    author: { name: string } | null;
  }>;
  emailLogs: Array<{
    id: string;
    subject: string;
    direction: string;
    sentAt: string;
  }>;
  callLogs: Array<{
    id: string;
    direction: string;
    duration: number | null;
    notes: string | null;
    calledAt: string;
  }>;
  dealContacts: Array<{
    role: string | null;
    deal: {
      id: string;
      name: string;
      stage: string;
      dealType: string;
      value: number | null;
      ebitda: number | null;
      company: { name: string } | null;
      notes: Array<{ content: string; createdAt: string }>;
    };
  }>;
}

export default function CallPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PrepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [talkingPoints, setTalkingPoints] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${id}/prep`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [id]);

  async function generateTalkingPoints() {
    if (!data) return;
    setGenerating(true);

    const notesText = data.notes
      .map((n) => {
        const header = n.meetingTitle
          ? `[${n.source.toUpperCase()}] ${n.meetingTitle} (${formatDate(n.meetingDate ?? n.createdAt)})`
          : `[NOTE] ${formatDate(n.createdAt)}`;
        const body = n.transcript ? `Summary: ${n.content}\n\nTranscript: ${n.transcript.slice(0, 800)}` : n.content;
        return `${header}\n${body}`;
      })
      .join("\n\n---\n\n");

    const emailHistory = data.emailLogs
      .slice(0, 5)
      .map((e) => `${e.direction.toUpperCase()} - "${e.subject}" (${formatDate(e.sentAt)})`)
      .join("\n");

    const dealsText = data.dealContacts
      .map((dc) => {
        const stage = getDealStage(dc.deal.stage);
        const dealNotes = dc.deal.notes.map((n) => n.content).join("; ");
        return `${dc.deal.name} (${stage.label}) - EBITDA: ${dc.deal.ebitda ? `$${dc.deal.ebitda}M` : "TBD"} - Notes: ${dealNotes || "None"}`;
      })
      .join("\n");

    const res = await fetch(`/api/contacts/${id}/prep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          contact: {
            name: `${data.firstName} ${data.lastName}`,
            title: data.title,
            status: data.status,
            tags: data.tags,
            lastContactedAt: data.lastContactedAt,
          },
          company: data.company
            ? {
                name: data.company.name,
                industry: data.company.industry,
                subIndustry: data.company.subIndustry,
                description: data.company.description,
                hqLocation: data.company.hqLocation,
                employeeCount: data.company.employeeCount,
                revenue: data.company.revenue,
              }
            : null,
          notes: notesText || "No notes available",
          deals: dealsText || "No active deals",
          emailHistory: emailHistory || "No email history",
        },
      }),
    });

    const result = await res.json();
    setTalkingPoints(result.talkingPoints);
    setGenerating(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(talkingPoints);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Loading call prep...</div>
      </div>
    );
  }

  if (!data) return null;

  const meetingNotes = data.notes.filter((n) => n.source === "granola" || n.source === "meeting");
  const regularNotes = data.notes.filter((n) => n.source === "manual");
  const pinnedNotes = data.notes.filter((n) => n.isPinned);

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <Link href={`/contacts/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 w-fit">
          <ChevronLeft size={14} /> Back to Contact
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Call Prep: {data.firstName} {data.lastName}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {[data.title, data.company?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock size={12} /> Last contact: {formatRelativeTime(data.lastContactedAt)}
            </p>
            <button
              onClick={generateTalkingPoints}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
            >
              {generating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {generating ? "Generating..." : "Generate AI Briefing"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-5 max-w-screen-xl mx-auto w-full">
        {/* Left column: AI Briefing */}
        <div className="lg:col-span-3 space-y-4">
          {/* AI Talking Points */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                <h2 className="font-semibold text-slate-800">AI Pre-Call Briefing</h2>
              </div>
              {talkingPoints && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                >
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
            <div className="p-5">
              {!talkingPoints && !generating && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Sparkles size={32} className="text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium mb-1">AI Briefing not yet generated</p>
                  <p className="text-slate-400 text-sm mb-4">
                    Click Generate to get personalized talking points based on all notes, transcripts, and deal history.
                  </p>
                  <button
                    onClick={generateTalkingPoints}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Sparkles size={14} /> Generate AI Briefing
                  </button>
                </div>
              )}
              {generating && (
                <div className="flex flex-col items-center justify-center py-10">
                  <RefreshCw size={28} className="text-blue-400 animate-spin mb-3" />
                  <p className="text-slate-500 text-sm">Analyzing notes and generating briefing...</p>
                </div>
              )}
              {talkingPoints && !generating && (
                <div className="prose prose-sm prose-slate max-w-none">
                  <ReactMarkdown>{talkingPoints}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* Meeting Transcripts (Granola) */}
          {meetingNotes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <MessageSquare size={16} className="text-purple-500" />
                <h2 className="font-semibold text-slate-800">Meeting Notes & Transcripts</h2>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {meetingNotes.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {meetingNotes.map((note) => (
                  <div key={note.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        note.source === "granola"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {note.source === "granola" ? "Granola" : "Meeting"}
                      </span>
                      {note.meetingTitle && (
                        <span className="text-sm font-medium text-slate-800">{note.meetingTitle}</span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {formatDate(note.meetingDate ?? note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                    {note.transcript && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700 select-none">
                          View full transcript
                        </summary>
                        <pre className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-3 whitespace-pre-wrap font-sans leading-relaxed overflow-auto max-h-64">
                          {note.transcript}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-100 bg-amber-50 rounded-t-xl">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="font-semibold text-slate-800">Pinned Notes</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {pinnedNotes.map((note) => (
                  <div key={note.id} className="p-4 bg-amber-50/30">
                    <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {note.author?.name ?? "You"} · {formatRelativeTime(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes */}
          {regularNotes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <FileText size={16} className="text-slate-400" />
                <h2 className="font-semibold text-slate-800">Notes</h2>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {regularNotes.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {regularNotes.slice(0, 5).map((note) => (
                  <div key={note.id} className="p-4">
                    <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {note.author?.name ?? "You"} · {formatRelativeTime(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Context Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact Quick Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Phone size={14} className="text-slate-400" /> Contact Info
            </h3>
            <div className="space-y-2 text-sm">
              {data.email && (
                <a href={`mailto:${data.email}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
                  <Mail size={13} className="text-slate-400" /> {data.email}
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-green-600">
                  <Phone size={13} className="text-slate-400" /> {data.phone}
                </a>
              )}
              {data.tags && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {data.tags.split(",").filter(Boolean).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Company Info */}
          {data.company && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" /> {data.company.name}
              </h3>
              <dl className="space-y-2 text-sm">
                {data.company.industry && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide">Industry</dt>
                    <dd className="text-slate-700">{data.company.industry}{data.company.subIndustry ? ` · ${data.company.subIndustry}` : ""}</dd>
                  </div>
                )}
                {data.company.hqLocation && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide">Location</dt>
                    <dd className="text-slate-700">{data.company.hqLocation}</dd>
                  </div>
                )}
                {data.company.employeeCount && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide">Employees</dt>
                    <dd className="text-slate-700">{data.company.employeeCount.toLocaleString()}</dd>
                  </div>
                )}
                {data.company.revenue && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide">Revenue</dt>
                    <dd className="text-slate-700">${data.company.revenue.toFixed(0)}M</dd>
                  </div>
                )}
                {data.company.description && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide">About</dt>
                    <dd className="text-slate-600 leading-relaxed text-xs">{data.company.description}</dd>
                  </div>
                )}
                <div className="pt-1">
                  <Link href={`/companies/${data.company.id}`}
                    className="text-blue-600 hover:text-blue-700 text-xs">
                    View full company profile →
                  </Link>
                </div>
              </dl>
            </div>
          )}

          {/* Active Deals */}
          {data.dealContacts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Target size={14} className="text-slate-400" /> Active Deals
              </h3>
              <div className="space-y-2">
                {data.dealContacts.map((dc) => {
                  const stage = getDealStage(dc.deal.stage);
                  return (
                    <Link key={dc.deal.id} href={`/deals/${dc.deal.id}`}
                      className="block p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-800">{dc.deal.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: stage.color + "20", color: stage.color }}>
                          {stage.label}
                        </span>
                      </div>
                      {dc.deal.ebitda && (
                        <p className="text-xs text-slate-500">EBITDA: ${dc.deal.ebitda}M</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Calls */}
          {data.callLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Phone size={14} className="text-slate-400" /> Recent Calls
              </h3>
              <div className="space-y-2">
                {data.callLogs.slice(0, 5).map((call) => (
                  <div key={call.id} className="flex items-start gap-2 text-sm py-1 border-b border-slate-50 last:border-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      call.direction === "outbound" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    }`}>
                      {call.direction}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">{formatRelativeTime(call.calledAt)} · {formatDuration(call.duration)}</p>
                      {call.notes && <p className="text-xs text-slate-600 mt-0.5 truncate">{call.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Emails */}
          {data.emailLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Mail size={14} className="text-slate-400" /> Recent Emails
              </h3>
              <div className="space-y-1">
                {data.emailLogs.slice(0, 5).map((email) => (
                  <div key={email.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className={`px-1.5 py-0.5 rounded flex-shrink-0 ${
                      email.direction === "outbound" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    }`}>
                      {email.direction}
                    </span>
                    <span className="text-slate-700 truncate flex-1">{email.subject}</span>
                    <span className="text-slate-400 flex-shrink-0">{formatRelativeTime(email.sentAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
