import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      emailLogs: { orderBy: { sentAt: "desc" }, take: 50 },
      callLogs: { orderBy: { calledAt: "desc" }, take: 50 },
      dealContacts: { include: { deal: { include: { company: true } } } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      sequenceEnrollments: {
        include: { sequence: true },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      title: data.title,
      linkedinUrl: data.linkedinUrl,
      companyId: data.companyId,
      status: data.status,
      leadSource: data.leadSource,
      tags: data.tags,
    },
    include: { company: true },
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
