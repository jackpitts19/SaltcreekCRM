export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const q = (query ?? "").toLowerCase();

  // Tasks / to-do
  if (q.includes("task") || q.includes("todo") || q.includes("to do") || q.includes("to-do")) {
    const tasks = await prisma.task.findMany({
      where: { status: "pending" },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      take: 8,
    });
    if (tasks.length === 0) {
      return NextResponse.json({ answer: "No pending tasks — you're all caught up!" });
    }
    const list = tasks
      .map((t: any) => {
        const who = t.contact
          ? `${t.contact.firstName} ${t.contact.lastName}`
          : t.company?.name ?? null;
        const due = t.dueDate
          ? ` — due ${new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "";
        return `• ${t.title}${who ? ` (${who})` : ""}${due}`;
      })
      .join("\n");
    return NextResponse.json({ answer: `You have ${tasks.length} pending tasks:\n\n${list}` });
  }

  // Deals / pipeline
  if (q.includes("deal") || q.includes("pipeline") || q.includes("open deal")) {
    const deals = await prisma.deal.findMany({
      where: { stage: { notIn: ["closed_won", "closed_lost"] } },
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    });
    if (deals.length === 0) {
      return NextResponse.json({ answer: "No active deals in the pipeline." });
    }
    const list = deals
      .map((d: any) => {
        const stageFmt = d.stage.replace(/_/g, " ");
        const val = d.value ? ` — $${d.value.toFixed(0)}M` : "";
        return `• ${d.name}${d.company ? ` (${d.company.name})` : ""} · ${stageFmt}${val}`;
      })
      .join("\n");
    return NextResponse.json({ answer: `${deals.length} active deals in the pipeline:\n\n${list}` });
  }

  // Prep / meeting
  if (q.includes("prep") || q.includes("meeting")) {
    const contacts = await prisma.contact.findMany({
      orderBy: [{ lastContactedAt: "desc" }, { updatedAt: "desc" }],
      include: { company: { select: { name: true } } },
      take: 3,
    });
    if (contacts.length === 0) {
      return NextResponse.json({ answer: "No contacts found yet. Add some contacts to get started." });
    }
    const c = contacts[0];
    const others = contacts.slice(1).map((x: any) => `${x.firstName} ${x.lastName}`).join(", ");
    return NextResponse.json({
      answer: `Here are your most recently active contacts:\n\n• ${c.firstName} ${c.lastName}${c.company ? ` — ${c.company.name}` : ""}${others ? `\n• ${others}` : ""}\n\nVisit /contacts/${c.id}/prep for a full call prep briefing on ${c.firstName}.`,
    });
  }

  // Contacts
  if (q.includes("contact") || q.includes("who")) {
    const contacts = await prisma.contact.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    });
    if (contacts.length === 0) {
      return NextResponse.json({ answer: "No contacts found yet." });
    }
    const list = contacts
      .map((c: any) => `• ${c.firstName} ${c.lastName}${c.company ? ` — ${c.company.name}` : ""}${c.title ? ` (${c.title})` : ""}`)
      .join("\n");
    return NextResponse.json({ answer: `Recent contacts:\n\n${list}` });
  }

  // Companies
  if (q.includes("compan") || q.includes("account") || q.includes("firm")) {
    const companies = await prisma.company.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
    });
    if (companies.length === 0) {
      return NextResponse.json({ answer: "No companies found yet." });
    }
    const list = companies
      .map((c: any) => `• ${c.name}${c.industry ? ` — ${c.industry}` : ""}${c.hqLocation ? ` (${c.hqLocation})` : ""}`)
      .join("\n");
    return NextResponse.json({ answer: `Recent companies:\n\n${list}` });
  }

  // Fallback
  return NextResponse.json({
    answer:
      "I can help you find contacts, deals, tasks, and more.\n\nTry asking:\n• \"Show my pending tasks\"\n• \"What's in the pipeline?\"\n• \"Prep for next meeting\"\n• \"Who are my contacts?\"",
  });
}
