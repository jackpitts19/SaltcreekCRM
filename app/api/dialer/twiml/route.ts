export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") ?? ""

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call now.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}" timeout="30">
    <Number>${to}</Number>
  </Dial>
</Response>`

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  })
}
