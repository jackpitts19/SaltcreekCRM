export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const { transcript, meetingTitle } = await req.json()

  if (!transcript) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 })
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an assistant for an investment bank CRM. Analyze meeting transcripts and extract:
1. A concise summary of the meeting (2-4 sentences)
2. Specific follow-up action items

Return a JSON object with:
- "summary": string — 2-4 sentence meeting summary
- "followups": array of objects, each with:
  - "title": string — short action item title (e.g., "Send term sheet to John Smith")
  - "description": string — more detail (optional, can be empty string)
  - "priority": "high" | "medium" | "low"
  - "dueDays": number — suggested days from today to complete (e.g., 1, 3, 7, 14, 30)

Only include concrete, actionable follow-ups. If there are none, return an empty array.`,
      },
      {
        role: "user",
        content: `Meeting title: ${meetingTitle || "Untitled Meeting"}\n\nTranscript:\n${transcript}`,
      },
    ],
  })

  const raw = completion.choices[0].message.content ?? "{}"
  const parsed = JSON.parse(raw)

  return NextResponse.json({
    summary: parsed.summary ?? "",
    followups: Array.isArray(parsed.followups) ? parsed.followups : [],
  })
}
