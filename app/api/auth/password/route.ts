import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { getSession } from "@/lib/auth"

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { oldPassword, newPassword } = await req.json()
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // If user already has a password, verify the old one
  if (user.password) {
    if (!oldPassword) return NextResponse.json({ error: "Current password is required" }, { status: 400 })
    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: session.userId }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
