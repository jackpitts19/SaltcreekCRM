export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

// Pick the best outbound number based on the contact's area code (local presence).
// Falls back to the default TWILIO_PHONE_NUMBER if no match found.
function pickCallerId(contactPhone: string): string {
  const localNumbers: Record<string, string> = JSON.parse(
    process.env.TWILIO_LOCAL_NUMBERS ?? "{}"
  )
  const areaCode = contactPhone.replace(/\D/g, "").slice(0, 3)
  return localNumbers[areaCode] ?? process.env.TWILIO_PHONE_NUMBER!
}

export async function POST(req: NextRequest) {
  const { contactPhone, contactId } = await req.json()

  if (!contactPhone) {
    return NextResponse.json({ error: "No phone number" }, { status: 400 })
  }

  const digits = contactPhone.replace(/\D/g, "")
  const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`
  const callerId = pickCallerId(digits)

  // Inline TwiML — record the bridged call if a callback URL is configured
  const recordingCallback = process.env.RECORDING_CALLBACK_URL
    ? ` recordingStatusCallback="${process.env.RECORDING_CALLBACK_URL}" recordingStatusCallbackMethod="POST"`
    : ""
  const record = recordingCallback ? ` record="record-from-answer"` : ""
  const twiml = `<Response><Dial callerId="${callerId}" timeout="30"${record}${recordingCallback}><Number>${e164}</Number></Dial></Response>`

  const call = await client.calls.create({
    to: `+1${process.env.DIALER_USER_PHONE}`,
    from: callerId,
    twiml,
  })

  return NextResponse.json({ callSid: call.sid })
}
