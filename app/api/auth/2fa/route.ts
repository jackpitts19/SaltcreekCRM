export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateTotpSecret, getTotpauthUrl, verifyTotp } from "@/lib/totp"
import QRCode from "qrcode"
import { getSession } from "@/lib/auth"

// GET: generate a new TOTP secret and return QR code (for setup)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const secret = generateTotpSecret()
  const otpauthUrl = getTotpauthUrl(session.email, "Salt Creek CRM", secret)
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl)

  // Store pending secret in DB (not yet "active" — activated on POST verify)
  await prisma.user.update({
    where: { id: session.userId },
    data: { totpSecret: `pending:${secret}` },
  })

  return NextResponse.json({ qrDataUrl, secret })
}

// POST: verify TOTP code and activate 2FA
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { code, disable } = await req.json()

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  if (disable) {
    // Disable 2FA — verify current code first
    const secret = user.totpSecret?.replace("pending:", "")
    if (!secret) return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 })
    const valid = verifyTotp(code, secret)
    if (!valid) return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    await prisma.user.update({ where: { id: session.userId }, data: { totpSecret: null } })
    return NextResponse.json({ ok: true, disabled: true })
  }

  // Enable: secret should be in "pending:SECRET" format
  const pendingSecret = user.totpSecret?.startsWith("pending:") ? user.totpSecret.slice(8) : null
  if (!pendingSecret) return NextResponse.json({ error: "No pending 2FA setup found" }, { status: 400 })

  const valid = verifyTotp(code, pendingSecret)
  if (!valid) return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 })

  // Activate — remove "pending:" prefix
  await prisma.user.update({ where: { id: session.userId }, data: { totpSecret: pendingSecret } })
  return NextResponse.json({ ok: true, enabled: true })
}
