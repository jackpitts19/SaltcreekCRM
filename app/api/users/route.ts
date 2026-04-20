export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, title: true, role: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      title: body.title ?? null,
      role: body.role ?? "banker",
    },
  });
  return NextResponse.json(user, { status: 201 });
}
