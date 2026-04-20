import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const search = searchParams.get("search") ?? "";

  const emails = await prisma.emailLog.findMany({
    where: {
      AND: [
        contactId ? { contactId } : {},
        search
          ? {
              OR: [
                { subject: { contains: search } },
                { fromEmail: { contains: search } },
                { toEmail: { contains: search } },
              ],
            }
          : {},
      ],
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  return NextResponse.json(emails);
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const email = await prisma.emailLog.create({
    data: {
      subject: data.subject,
      body: data.body ?? null,
      direction: data.direction ?? "outbound",
      fromEmail: data.fromEmail,
      toEmail: data.toEmail,
      ccEmail: data.ccEmail ?? null,
      status: data.status ?? "sent",
      contactId: data.contactId ?? null,
      userId: data.userId ?? null,
      gmailMsgId: data.gmailMsgId ?? null,
      gmailThreadId: data.gmailThreadId ?? null,
      sentAt: data.sentAt ? new Date(data.sentAt) : new Date(),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.activity.create({
    data: {
      type: "email",
      description: `Email "${data.subject}" ${data.direction === "inbound" ? "received from" : "sent to"} ${data.toEmail}`,
      contactId: data.contactId ?? undefined,
    },
  });

  return NextResponse.json(email, { status: 201 });
}
