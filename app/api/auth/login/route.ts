export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { verifyTotp } from "@/lib/totp"
import { signSession, sessionCookieOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password, totp } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // If 2FA is enabled, verify TOTP
    if (user.totpSecret) {
      if (!totp) {
        return NextResponse.json({ requireTotp: true })
      }
      const totpValid = verifyTotp(totp, user.totpSecret)
      if (!totpValid) {
        return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 })
      }
    }

    // Issue session
    const token = await signSession({ userId: user.id, email: user.email, name: user.name })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(sessionCookieOptions(token))
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
