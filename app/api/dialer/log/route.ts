export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { contactId, outcome, notes, duration } = await req.json()

  const log = await prisma.callLog.create({
    data: {
      direction: "outbound",
      status: outcome,
      fromNumber: process.env.DIALER_USER_PHONE ?? "",
      notes: notes || null,
      duration: duration ?? null,
      contactId: contactId || null,
    },
  })

  // Auto-create a Note so call notes appear in the contact's Notes tab
  if (notes?.trim() && contactId) {
    const durationStr = duration ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)` : ""
    await prisma.note.create({
      data: {
        content: `📞 Call — ${outcome}${durationStr}\n\n${notes.trim()}`,
        source: "call",
        contactId,
      },
    })
  }

  return NextResponse.json(log, { status: 201 })
}
