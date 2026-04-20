import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");

  const calls = await prisma.callLog.findMany({
    where: contactId ? { contactId } : {},
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { calledAt: "desc" },
    take: 100,
  });

  return NextResponse.json(calls);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const call = await prisma.callLog.create({
    data: {
      direction: data.direction ?? "outbound",
      duration: data.duration ? parseInt(data.duration) : null,
      status: data.status ?? "completed",
      fromNumber: data.fromNumber ?? null,
      toNumber: data.toNumber ?? null,
      notes: data.notes ?? null,
      recording: data.recording ?? null,
      kixieCallId: data.kixieCallId ?? null,
      contactId: data.contactId ?? null,
      userId: data.userId ?? null,
      calledAt: data.calledAt ? new Date(data.calledAt) : new Date(),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (data.contactId) {
    await prisma.contact.update({
      where: { id: data.contactId },
      data: { lastContactedAt: new Date() },
    });
  }

  await prisma.activity.create({
    data: {
      type: "call",
      description: `${data.direction === "inbound" ? "Inbound" : "Outbound"} call - ${data.status}${data.duration ? ` (${Math.floor(data.duration / 60)}m)` : ""}`,
      contactId: data.contactId ?? undefined,
    },
  });

  return NextResponse.json(call, { status: 201 });
}
