export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface Followup {
  title: string
  description?: string
  priority?: "high" | "medium" | "low"
  dueDays?: number
}

export async function POST(req: NextRequest) {
  const { contactId, companyId, dealId, meetingTitle, transcript, summary, followups } =
    await req.json()

  const noteContent = summary
    ? `## Summary\n${summary}\n\n## Transcript\n${transcript}`
    : transcript

  const note = await prisma.note.create({
    data: {
      content: noteContent,
      source: "recording",
      meetingTitle: meetingTitle || "Untitled Meeting",
      transcript,
      meetingDate: new Date(),
      contactId: contactId || null,
      companyId: companyId || null,
      dealId: dealId || null,
    },
  })

  const tasks = []
  if (Array.isArray(followups) && followups.length > 0) {
    for (const f of followups as Followup[]) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + (f.dueDays ?? 7))

      const task = await prisma.task.create({
        data: {
          title: f.title,
          description: f.description || null,
          dueDate,
          priority: f.priority ?? "medium",
          status: "pending",
          contactId: contactId || null,
          companyId: companyId || null,
          dealId: dealId || null,
        },
      })
      tasks.push(task)
    }
  }

  return NextResponse.json({ note, tasks }, { status: 201 })
}
