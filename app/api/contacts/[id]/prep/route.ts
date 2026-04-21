export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      notes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { author: { select: { name: true } } },
      },
      emailLogs: { orderBy: { sentAt: "desc" }, take: 10 },
      callLogs: { orderBy: { calledAt: "desc" }, take: 10 },
      dealContacts: {
        include: {
          deal: {
            include: {
              company: { select: { name: true } },
              notes: { orderBy: { createdAt: "desc" }, take: 5 },
            },
          },
        },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(contact)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { context } = await req.json()

  // Generate AI talking points
  const prompt = `You are an M&A investment banker at Salt Creek Advisory, a lower-middle market advisory firm focused on businesses with $1-5M EBITDA. Generate a concise pre-call briefing for the following contact.

Contact Information:
${JSON.stringify(context.contact, null, 2)}

Company Information:
${JSON.stringify(context.company, null, 2)}

Recent Notes & Meeting Transcripts:
${context.notes}

Active Deals:
${context.deals}

Email History Summary:
${context.emailHistory}

Generate a structured briefing with these sections:
1. **Quick Brief** (2-3 sentences: who they are, why they matter, current relationship stage)
2. **Key Talking Points** (3-5 bullet points tailored to their role and the deal stage)
3. **Questions to Ask** (3-4 discovery/follow-up questions based on past conversations)
4. **Watch Outs** (any sensitivities, objections, or topics to handle carefully)
5. **Next Step Recommendation** (one clear recommended CTA based on the relationship stage)

Be specific, actionable, and reference actual details from the notes. Avoid generic advice. Format as clean markdown.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1200,
  })

  const talkingPoints = completion.choices[0]?.message?.content ?? ""

  return NextResponse.json({ talkingPoints })
}
