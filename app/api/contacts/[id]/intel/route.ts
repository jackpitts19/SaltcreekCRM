export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import OpenAI from "openai"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      notes: {
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { author: { select: { name: true } } },
      },
      emailLogs: { orderBy: { sentAt: "desc" }, take: 10 },
      callLogs: { orderBy: { calledAt: "desc" }, take: 10 },
      dealContacts: {
        include: {
          deal: { select: { name: true, stage: true, dealType: true, value: true } },
        },
      },
    },
  })

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const fullName = `${contact.firstName} ${contact.lastName}`
  const companyName = contact.company?.name ?? ""
  const title = contact.title ?? ""

  const crmContext = [
    `Name: ${fullName}`,
    title ? `Title: ${title}` : "",
    companyName ? `Company: ${companyName}` : "",
    contact.company?.industry ? `Industry: ${contact.company.industry}` : "",
    contact.company?.hqLocation ? `Location: ${contact.company.hqLocation}` : "",
    contact.email ? `Email: ${contact.email}` : "",
    contact.linkedinUrl ? `LinkedIn: ${contact.linkedinUrl}` : "",
    "",
    contact.notes.length > 0
      ? `Meeting Notes & Interactions:\n${contact.notes
          .map((n) => `- ${n.meetingTitle ? `[${n.meetingTitle}] ` : ""}${n.content}`)
          .join("\n")}`
      : "No meeting notes on file.",
    "",
    contact.emailLogs.length > 0
      ? `Email History (${contact.emailLogs.length} emails):\n${contact.emailLogs
          .map((e) => `- ${e.direction === "inbound" ? "Received" : "Sent"}: "${e.subject}"`)
          .join("\n")}`
      : "No email history.",
    "",
    contact.callLogs.length > 0
      ? `Call History (${contact.callLogs.length} calls):\n${contact.callLogs
          .map((c) => `- ${c.direction} call, ${c.duration ? Math.round(c.duration / 60) + " min" : "unknown duration"}${c.notes ? `: ${c.notes}` : ""}`)
          .join("\n")}`
      : "No call history.",
    "",
    contact.dealContacts.length > 0
      ? `Deals:\n${contact.dealContacts
          .map((dc) => `- ${dc.deal.name} (${dc.deal.dealType}, stage: ${dc.deal.stage}${dc.deal.value ? `, $${(dc.deal.value / 1000000).toFixed(1)}M` : ""})`)
          .join("\n")}`
      : "No deals associated.",
  ]
    .filter(Boolean)
    .join("\n")

  const searchQuery = [fullName, title, companyName].filter(Boolean).join(", ")

  const prompt = `You are an M&A investment banking analyst at Salt Creek Advisory. Research and write a concise intelligence brief on ${fullName}.

Use web search to find current, factual information about this person. Then combine that with the CRM data below.

CRM DATA:
${crmContext}

Write a bio with these sections:
**Who They Are** — 2-3 sentences: their background, current role, and what they're known for professionally.

**Professional Background** — bullet points covering career history, past companies, education, or notable achievements found online.

**Why They Matter to Salt Creek** — 1-2 sentences on their relevance to our M&A advisory work (deal potential, referral value, industry connections, etc.).

**Key Facts**
- Any relevant public information: board seats, investments, publications, news mentions, etc.

Be specific and factual. If you can't find public information, note it. Keep the whole brief under 300 words.`

  try {
    let bio = ""
    try {
      // Use gpt-4o-search-preview for web search capability
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-search-preview",
        messages: [{ role: "user", content: prompt }],
        web_search_options: {
          search_context_size: "medium",
          user_location: {
            type: "approximate",
            approximate: { country: "US", city: "Chicago", region: "Illinois" },
          },
        },
      })
      bio = completion.choices[0]?.message?.content ?? ""
    } catch {
      // Fallback to gpt-4o without web search
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 600,
      })
      bio = completion.choices[0]?.message?.content ?? ""
    }
    return NextResponse.json({ bio })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const isQuota = message.includes("429") || message.includes("quota")
    return NextResponse.json(
      { error: isQuota ? "OpenAI quota exceeded — add credits at platform.openai.com" : "Failed to generate intel" },
      { status: 500 }
    )
  }
}
