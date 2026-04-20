export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      enrollments: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sequence);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  const sequence = await prisma.sequence.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json(sequence);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.sequence.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
