"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import { BarChart3, TrendingUp, Users, Building2, Mail, Phone, Zap, DollarSign, Download, Printer, Trophy } from "lucide-react";
import { formatCurrency, getDealStage, DEAL_STAGES } from "@/lib/utils";
import Link from "next/link";

interface ReportData {
  totalContacts: number;
  totalCompanies: number;
  totalDeals: number;
  pipelineValue: number;
  closedWonValue: number;
  closedLostValue: number;
  winRate: number | null;
  totalEmails: number;
  totalCalls: number;
  dealsByStage: { stage: string; count: number; value: number }[];
  recentWins: { id: string; name: string; value: number | null; closedAt: string | null }[];
  topContacts: { id: string; name: string; emailCount: number; callCount: number }[];
  sequenceStats: { id: string; name: string; enrollments: number; steps: number }[];
  callOutcomes: { outcome: string; count: number }[];
  emailDirections: { direction: string; count: number }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then(r => r.json()),
      fetch("/api/companies").then(r => r.json()),
      fetch("/api/deals").then(r => r.json()),
      fetch("/api/emails").then(r => r.json()),
      fetch("/api/calls").then(r => r.json()),
      fetch("/api/sequences").then(r => r.json()),
    ]).then(([contacts, companies, deals, emails, calls, sequences]) => {
      const openDeals = deals.filter((d: any) => !["closed_won", "closed_lost"].includes(d.stage));
      const closedWon = deals.filter((d: any) => d.stage === "closed_won");
      const closedLost = deals.filter((d: any) => d.stage === "closed_lost");

      const dealsByStage = DEAL_STAGES.map(s => ({
        stage: s.id,
        count: deals.filter((d: any) => d.stage === s.id).length,
        value: deals.filter((d: any) => d.stage === s.id).reduce((sum: number, d: any) => sum + (d.value ?? 0), 0),
      })).filter(s => s.count > 0);

      const callOutcomeMap: Record<string, number> = {};
      calls.forEach((c: any) => {
        const k = c.outcome ?? "unknown";
        callOutcomeMap[k] = (callOutcomeMap[k] ?? 0) + 1;
      });

      const emailDirMap: Record<string, number> = {};
      emails.forEach((e: any) => {
        const k = e.direction ?? "outbound";
        emailDirMap[k] = (emailDirMap[k] ?? 0) + 1;
      });

      const winRate = closedWon.length + closedLost.length > 0
        ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100)
        : null;

      setData({
        totalContacts: contacts.length,
        totalCompanies: companies.length,
        totalDeals: deals.length,
        pipelineValue: openDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0),
        closedWonValue: closedWon.reduce((s: number, d: any) => s + (d.value ?? 0), 0),
        closedLostValue: closedLost.reduce((s: number, d: any) => s + (d.value ?? 0), 0),
        winRate,
        totalEmails: emails.length,
        totalCalls: calls.length,
        dealsByStage,
        recentWins: closedWon.slice(0, 5).map((d: any) => ({ id: d.id, name: d.name, value: d.value, closedAt: d.updatedAt })),
        topContacts: contacts
          .sort((a: any, b: any) => (b._count?.emailLogs ?? 0) + (b._count?.callLogs ?? 0) - (a._count?.emailLogs ?? 0) - (a._count?.callLogs ?? 0))
          .slice(0, 5)
          .map((c: any) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, emailCount: c._count?.emailLogs ?? 0, callCount: c._count?.callLogs ?? 0 })),
        sequenceStats: sequences.slice(0, 5).map((s: any) => ({
          id: s.id, name: s.name, enrollments: s._count?.enrollments ?? 0, steps: s.steps?.length ?? 0,
        })),
        callOutcomes: Object.entries(callOutcomeMap).map(([outcome, count]) => ({ outcome, count })),
        emailDirections: Object.entries(emailDirMap).map(([direction, count]) => ({ direction, count })),
      });
      setLoading(false);
    });
  }, []);

  function exportCSV() {
    if (!data) return;
    const rows: string[][] = [];
    const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;

    rows.push(["SUMMARY"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Contacts", String(data.totalContacts)]);
    rows.push(["Total Companies", String(data.totalCompanies)]);
    rows.push(["Total Deals", String(data.totalDeals)]);
    rows.push(["Pipeline Value ($M)", String(data.pipelineValue)]);
    rows.push(["Closed Won ($M)", String(data.closedWonValue)]);
    rows.push(["Total Emails", String(data.totalEmails)]);
    rows.push(["Total Calls", String(data.totalCalls)]);
    rows.push([]);
    rows.push(["PIPELINE BY STAGE"]);
    rows.push(["Stage", "Count", "Value ($M)"]);
    data.dealsByStage.forEach(s => rows.push([getDealStage(s.stage).label, String(s.count), String(s.value)]));
    rows.push([]);
    rows.push(["RECENT WINS"]);
    rows.push(["Deal Name", "Value ($M)"]);
    data.recentWins.forEach(d => rows.push([d.name, String(d.value ?? "")]));
    rows.push([]);
    rows.push(["MOST ACTIVE CONTACTS"]);
    rows.push(["Name", "Emails", "Calls"]);
    data.topContacts.forEach(c => rows.push([c.name, String(c.emailCount), String(c.callCount)]));
    rows.push([]);
    rows.push(["SEQUENCES"]);
    rows.push(["Name", "Steps", "Enrollments"]);
    data.sequenceStats.forEach(s => rows.push([s.name, String(s.steps), String(s.enrollments)]));

    const csv = rows.map(r => r.map(cell => q(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salt-creek-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!data) return;
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const stageRows = data.dealsByStage.map(s =>
      `<tr><td>${getDealStage(s.stage).label}</td><td>${s.count}</td><td>${formatCurrency(s.value)}</td></tr>`
    ).join("");
    const winRows = data.recentWins.map(d =>
      `<tr><td>${d.name}</td><td>${formatCurrency(d.value)}</td></tr>`
    ).join("");
    const contactRows = data.topContacts.map((c, i) =>
      `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.emailCount}</td><td>${c.callCount}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Salt Creek Advisory — Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 48px; color: #1e293b; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
  .sub { color: #64748b; margin: 0 0 32px; font-size: 13px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
  .stat .val { font-size: 22px; font-weight: 700; }
  .stat .lbl { color: #64748b; font-size: 11px; margin-top: 2px; }
  h2 { font-size: 14px; font-weight: 600; margin: 24px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  @media print { @page { margin: 32px; } }
</style></head><body>
<h1>Salt Creek Advisory — Pipeline Report</h1>
<p class="sub">Generated ${date}</p>
<div class="stats">
  <div class="stat"><div class="val">${data.totalContacts}</div><div class="lbl">Total Contacts</div></div>
  <div class="stat"><div class="val">${data.totalCompanies}</div><div class="lbl">Companies</div></div>
  <div class="stat"><div class="val">${data.totalDeals}</div><div class="lbl">Active Deals</div></div>
  <div class="stat"><div class="val">${formatCurrency(data.pipelineValue)}</div><div class="lbl">Pipeline Value</div></div>
  <div class="stat"><div class="val">${data.totalEmails}</div><div class="lbl">Emails Logged</div></div>
  <div class="stat"><div class="val">${data.totalCalls}</div><div class="lbl">Calls Logged</div></div>
  <div class="stat"><div class="val">${formatCurrency(data.closedWonValue)}</div><div class="lbl">Closed Won</div></div>
  <div class="stat"><div class="val">${formatCurrency(data.closedLostValue)}</div><div class="lbl">Closed Lost</div></div>
</div>
<h2>Pipeline by Stage</h2>
<table><thead><tr><th>Stage</th><th>Deals</th><th>Value</th></tr></thead><tbody>${stageRows}</tbody></table>
<h2>Recent Wins</h2>
<table><thead><tr><th>Deal</th><th>Value</th></tr></thead><tbody>${winRows || '<tr><td colspan="2" style="color:#94a3b8">No closed wins yet</td></tr>'}</tbody></table>
<h2>Most Active Contacts</h2>
<table><thead><tr><th>#</th><th>Name</th><th>Emails</th><th>Calls</th></tr></thead><tbody>${contactRows}</tbody></table>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  }

  if (loading) return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Reports" subtitle="Pipeline analytics and activity metrics" />
      <div className="p-6 py-12 text-center text-slate-400">Loading...</div>
    </div>
  );

  if (!data) return null;

  const maxDealCount = Math.max(...data.dealsByStage.map(s => s.count), 1);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Reports" subtitle="Pipeline analytics and activity metrics" />

      <div className="p-6 space-y-6">
        {/* Export buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Printer size={14} /> Export PDF
          </button>
        </div>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users size={18} className="text-blue-600" />} label="Total Contacts" value={data.totalContacts} bg="bg-blue-50" />
          <StatCard icon={<Building2 size={18} className="text-purple-600" />} label="Companies" value={data.totalCompanies} bg="bg-purple-50" />
          <StatCard icon={<TrendingUp size={18} className="text-green-600" />} label="Active Deals" value={data.totalDeals} bg="bg-green-50" />
          <StatCard icon={<DollarSign size={18} className="text-emerald-600" />} label="Pipeline Value" value={formatCurrency(data.pipelineValue)} bg="bg-emerald-50" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Mail size={18} className="text-sky-600" />} label="Emails Logged" value={data.totalEmails} bg="bg-sky-50" />
          <StatCard icon={<Phone size={18} className="text-orange-600" />} label="Calls Logged" value={data.totalCalls} bg="bg-orange-50" />
          <StatCard icon={<DollarSign size={18} className="text-green-600" />} label="Closed Won" value={formatCurrency(data.closedWonValue)} bg="bg-green-50" />
          <StatCard icon={<Trophy size={18} className="text-amber-500" />} label="Win Rate" value={data.winRate !== null ? `${data.winRate}%` : "—"} bg="bg-amber-50" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pipeline by Stage */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-slate-500" /> Pipeline by Stage
            </h2>
            {data.dealsByStage.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No deals yet</p>
            ) : (
              <div className="space-y-3">
                {data.dealsByStage.map(s => {
                  const stageInfo = getDealStage(s.stage);
                  const pct = Math.round((s.count / maxDealCount) * 100);
                  return (
                    <div key={s.stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 font-medium">{stageInfo.label}</span>
                        <div className="flex items-center gap-3 text-slate-500">
                          <span>{s.count} deal{s.count !== 1 ? "s" : ""}</span>
                          <span className="font-medium text-slate-700">{formatCurrency(s.value)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stageInfo.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Wins */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-500" /> Recent Closed Wins
            </h2>
            {data.recentWins.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No closed deals yet</p>
            ) : (
              <div className="space-y-2">
                {data.recentWins.map(d => (
                  <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-700">{formatCurrency(d.value)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Most Active Contacts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users size={16} className="text-blue-500" /> Most Active Contacts
            </h2>
            {data.topContacts.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No contacts yet</p>
            ) : (
              <div className="space-y-2">
                {data.topContacts.map((c, i) => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg transition-colors">
                    <span className="w-5 text-xs text-slate-400 font-medium">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                      {c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-800 font-medium flex-1">{c.name}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Mail size={11} /> {c.emailCount}</span>
                      <span className="flex items-center gap-1"><Phone size={11} /> {c.callCount}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sequences Performance */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Zap size={16} className="text-yellow-500" /> Sequences
            </h2>
            {data.sequenceStats.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No sequences created yet</p>
            ) : (
              <div className="space-y-2">
                {data.sequenceStats.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.steps} steps</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">{s.enrollments}</p>
                      <p className="text-xs text-slate-500">enrolled</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Breakdown */}
        {(data.callOutcomes.length > 0 || data.emailDirections.length > 0) && (
          <div className="grid grid-cols-2 gap-6">
            {data.callOutcomes.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Phone size={16} className="text-orange-500" /> Call Outcomes
                </h2>
                <div className="space-y-2">
                  {data.callOutcomes.map(o => (
                    <div key={o.outcome} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-700">{o.outcome.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-slate-900">{o.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.emailDirections.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Mail size={16} className="text-sky-500" /> Email Direction
                </h2>
                <div className="space-y-2">
                  {data.emailDirections.map(d => (
                    <div key={d.direction} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-700">{d.direction}</span>
                      <span className="font-semibold text-slate-900">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
