import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Kixie webhook endpoint
// Configure at https://app.kixie.com/settings/integrations/webhooks
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Kixie webhook payload structure
    const {
      call_id,
      direction,
      duration,
      status,
      from_number,
      to_number,
      recording_url,
      agent_email,
      contact_phone,
      call_time,
    } = data;

    // Find matching contact by phone number
    const phone = direction === "inbound" ? from_number : to_number;
    let contactId: string | null = null;

    if (phone) {
      const contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: { contains: phone.replace(/\D/g, "").slice(-10) } },
            { mobile: { contains: phone.replace(/\D/g, "").slice(-10) } },
          ],
        },
      });
      contactId = contact?.id ?? null;
    }

    // Find user by email
    let userId: string | null = null;
    if (agent_email) {
      const user = await prisma.user.findUnique({ where: { email: agent_email } });
      userId = user?.id ?? null;
    }

    // Upsert call log
    await prisma.callLog.upsert({
      where: { kixieCallId: String(call_id) },
      create: {
        kixieCallId: String(call_id),
        direction: direction ?? "outbound",
        duration: duration ? parseInt(duration) : null,
        status: status ?? "completed",
        fromNumber: from_number ?? null,
        toNumber: to_number ?? null,
        recording: recording_url ?? null,
        contactId,
        userId,
        calledAt: call_time ? new Date(call_time) : new Date(),
      },
      update: {
        duration: duration ? parseInt(duration) : undefined,
        status: status ?? undefined,
        recording: recording_url ?? undefined,
      },
    });

    if (contactId) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { lastContactedAt: new Date() },
      });

      await prisma.activity.create({
        data: {
          type: "call",
          description: `Kixie ${direction} call - ${status}${duration ? ` (${Math.floor(parseInt(duration) / 60)}m ${parseInt(duration) % 60}s)` : ""}`,
          contactId,
          userId: userId ?? undefined,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Kixie Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Kixie webhook endpoint active" });
}
