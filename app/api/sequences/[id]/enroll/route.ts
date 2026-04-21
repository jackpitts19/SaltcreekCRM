export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/sequences/[id]/enroll
// Body: { contactIds: string[] }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sequenceId } = await params;
  const { contactIds } = await req.json();

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: "contactIds required" }, { status: 400 });
  }

  // Find existing enrollments to avoid re-enrolling active ones
  const existing = await prisma.sequenceEnrollment.findMany({
    where: { sequenceId, contactId: { in: contactIds }, status: { in: ["active", "paused"] } },
    select: { contactId: true },
  });
  const existingIds = new Set(existing.map((e) => e.contactId));
  const toEnroll = contactIds.filter((id) => !existingIds.has(id));

  if (toEnroll.length === 0) {
    return NextResponse.json({ enrolled: 0, skipped: contactIds.length });
  }

  await prisma.sequenceEnrollment.createMany({
    data: toEnroll.map((contactId) => ({
      sequenceId,
      contactId,
      currentStep: 0,
      status: "active",
    })),
  });

  return NextResponse.json({ enrolled: toEnroll.length, skipped: existingIds.size });
}

// DELETE /api/sequences/[id]/enroll
// Body: { contactId: string }  — unenroll a contact
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sequenceId } = await params;
  const { contactId } = await req.json();

  await prisma.sequenceEnrollment.updateMany({
    where: { sequenceId, contactId },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
