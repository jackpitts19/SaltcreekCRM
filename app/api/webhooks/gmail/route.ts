export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Gmail push notification webhook
// Set up at https://developers.google.com/gmail/api/guides/push
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Gmail sends base64-encoded Pub/Sub messages
    const message = body?.message;
    if (!message?.data) {
      return NextResponse.json({ ok: true });
    }

    const decoded = Buffer.from(message.data, "base64").toString("utf-8");
    const notification = JSON.parse(decoded);

    // notification contains: emailAddress, historyId
    // In production, use Gmail API to fetch new messages using historyId
    // For now, log the notification
    console.log("[Gmail Webhook]", notification);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gmail Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Verify Gmail webhook
export async function GET() {
  return NextResponse.json({ status: "Gmail webhook endpoint active" });
}
