import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runReminderSweep } from "@/lib/reminders/admin";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    console.warn("[reminders] unauthorized scheduler request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReminderSweep(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[reminders] scheduler execution failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Scheduler execution failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
