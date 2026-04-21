export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

// POST /api/ai/summarize
// Body: { contactId: string }
// Returns: { summary: string }
export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      company: { select: { name: true, industry: true, revenue: true, hqLocation: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 15, select: { content: true, source: true, createdAt: true, meetingTitle: true } },
      emailLogs: { orderBy: { sentAt: "desc" }, take: 10, select: { subject: true, direction: true, sentAt: true } },
      callLogs: { orderBy: { calledAt: "desc" }, take: 10, select: { direction: true, duration: true, notes: true, calledAt: true } },
      dealContacts: {
        select: {
          role: true,
          deal: { select: { name: true, stage: true, value: true, dealType: true } },
        },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 15, select: { type: true, description: true, createdAt: true } },
    },
  });

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const contextLines: string[] = [
    `Name: ${contact.firstName} ${contact.lastName}`,
    contact.title ? `Title: ${contact.title}` : "",
    contact.company ? `Company: ${contact.company.name}${contact.company.industry ? ` (${contact.company.industry})` : ""}` : "",
    contact.status ? `Status: ${contact.status}` : "",
    contact.lastContactedAt ? `Last contacted: ${new Date(contact.lastContactedAt).toLocaleDateString()}` : "",
    "",
    contact.notes.length > 0 ? `Notes (${contact.notes.length}):\n${contact.notes.map(n => `- [${new Date(n.createdAt).toLocaleDateString()}] ${n.meetingTitle ? `"${n.meetingTitle}": ` : ""}${n.content.slice(0, 300)}`).join("\n")}` : "",
    contact.emailLogs.length > 0 ? `\nEmails (${contact.emailLogs.length}):\n${contact.emailLogs.map(e => `- ${e.direction} | ${e.subject} | ${new Date(e.sentAt).toLocaleDateString()}`).join("\n")}` : "",
    contact.callLogs.length > 0 ? `\nCalls (${contact.callLogs.length}):\n${contact.callLogs.map(c => `- ${c.direction} | ${c.duration ? `${Math.round(c.duration / 60)}min` : "unknown duration"} | ${new Date(c.calledAt).toLocaleDateString()}${c.notes ? ` | ${c.notes.slice(0, 150)}` : ""}`).join("\n")}` : "",
    contact.dealContacts.length > 0 ? `\nDeals:\n${contact.dealContacts.map(dc => `- ${dc.deal.name} (${dc.deal.stage})${dc.deal.value ? ` $${dc.deal.value}M` : ""}${dc.role ? ` — role: ${dc.role}` : ""}`).join("\n")}` : "",
  ].filter(Boolean);

  const prompt = `You are an M&A investment banker assistant at Salt Creek Advisory. Given the following contact history, write a concise 3-5 bullet summary covering: relationship status, key topics discussed, open items or next steps, and deal context if any. Be specific and actionable.

${contextLines.join("\n")}

Write the summary as bullet points using • character. Keep it under 200 words.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 400,
  });

  const summary = response.choices[0]?.message?.content ?? "Unable to generate summary.";
  return NextResponse.json({ summary });
}
