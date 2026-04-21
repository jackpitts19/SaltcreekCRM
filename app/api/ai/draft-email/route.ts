export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

// POST /api/ai/draft-email
// Body: { dealId: string, contactId?: string, tone?: string, context?: string }
// Returns: { subject: string, body: string }
export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { dealId, contactId, tone = "professional", context } = await req.json();
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      company: { select: { name: true, industry: true, revenue: true, hqLocation: true } },
      contacts: {
        select: {
          role: true,
          contact: {
            select: {
              id: true, firstName: true, lastName: true, title: true, email: true,
              notes: { orderBy: { createdAt: "desc" }, take: 5, select: { content: true, meetingTitle: true } },
            },
          },
        },
      },
      notes: { orderBy: { createdAt: "desc" }, take: 8, select: { content: true, createdAt: true } },
      assignedTo: { select: { name: true } },
    },
  });

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  // Determine primary recipient
  let recipient = deal.contacts.find((dc) => dc.contact.id === contactId)
    ?? deal.contacts[0]
    ?? null;

  const recipientName = recipient
    ? `${recipient.contact.firstName} ${recipient.contact.lastName}`
    : "the contact";
  const recipientTitle = recipient?.contact.title ?? "";
  const recipientRole = recipient?.role ?? "";

  const lines: string[] = [
    `Deal: ${deal.name}`,
    `Stage: ${deal.stage}`,
    deal.company ? `Company: ${deal.company.name}${deal.company.industry ? ` (${deal.company.industry})` : ""}` : "",
    deal.value ? `Deal Value: $${deal.value}M` : "",
    deal.expectedCloseDate ? `Expected Close: ${new Date(deal.expectedCloseDate).toLocaleDateString()}` : "",
    deal.description ? `\nDeal Description: ${deal.description}` : "",
    `\nRecipient: ${recipientName}${recipientTitle ? ` — ${recipientTitle}` : ""}${recipientRole ? ` (${recipientRole})` : ""}`,
    deal.notes.length > 0
      ? `\nRecent Deal Notes:\n${deal.notes.map((n) => `- ${n.content.slice(0, 200)}`).join("\n")}`
      : "",
    recipient && recipient.contact.notes.length > 0
      ? `\nContact Notes:\n${recipient.contact.notes.map((n) => `- ${n.meetingTitle ? `[${n.meetingTitle}] ` : ""}${n.content.slice(0, 200)}`).join("\n")}`
      : "",
    context ? `\nAdditional Context: ${context}` : "",
    deal.assignedTo ? `\nSender: ${deal.assignedTo.name} at Salt Creek Advisory` : "\nSender: Salt Creek Advisory",
  ].filter(Boolean);

  const prompt = `You are an M&A investment banker at Salt Creek Advisory drafting a ${tone} email.

Using the deal context below, write a concise follow-up email appropriate for the current deal stage. The email should:
- Be written in ${tone} tone
- Reference specific deal details naturally
- Have a clear purpose and call to action
- Sound like a real banker wrote it (not generic)
- Be 2-4 short paragraphs maximum

${lines.join("\n")}

Respond with exactly this JSON format:
{
  "subject": "Email subject line",
  "body": "Full email body with paragraphs separated by \\n\\n"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: { subject?: string; body?: string } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json({
    subject: parsed.subject ?? "",
    body: parsed.body ?? "",
  });
}
