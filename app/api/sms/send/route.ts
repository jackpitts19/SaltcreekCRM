export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { prisma } from "@/lib/db"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(req: NextRequest) {
  const { contactId, toPhone, body } = await req.json()

  if (!toPhone || !body) {
    return NextResponse.json({ error: "Missing toPhone or body" }, { status: 400 })
  }

  const digits = toPhone.replace(/\D/g, "")
  const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`
  const fromNumber = process.env.TWILIO_PHONE_NUMBER!

  const message = await client.messages.create({
    to: e164,
    from: fromNumber,
    body,
  })

  const log = await prisma.textMessage.create({
    data: {
      body,
      direction: "outbound",
      status: message.status,
      twilioSid: message.sid,
      fromNumber,
      toNumber: e164,
      contactId: contactId || null,
    },
  })

  return NextResponse.json(log, { status: 201 })
}
