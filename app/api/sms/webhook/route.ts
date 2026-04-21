export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Twilio sends inbound SMS here as form-encoded POST
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const from = form.get("From")?.toString() ?? ""
  const to = form.get("To")?.toString() ?? ""
  const body = form.get("Body")?.toString() ?? ""
  const sid = form.get("MessageSid")?.toString() ?? undefined

  // Try to match to a contact by phone number
  const digits = from.replace(/\D/g, "").slice(-10)
  const contact = await prisma.contact.findFirst({
    where: {
      OR: [
        { phone: { contains: digits } },
        { mobile: { contains: digits } },
      ],
    },
  })

  await prisma.textMessage.create({
    data: {
      body,
      direction: "inbound",
      status: "received",
      twilioSid: sid,
      fromNumber: from,
      toNumber: to,
      contactId: contact?.id ?? null,
    },
  })

  // Return empty TwiML — no auto-reply
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    headers: { "Content-Type": "text/xml" },
  })
}
