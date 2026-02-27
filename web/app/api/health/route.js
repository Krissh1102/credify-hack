import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    // Minimal test to ensure Prisma can reach the DB
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[HEALTH_CHECK] DB connection failed", error);
    return NextResponse.json(
      { ok: false, error: String(error.message || error) },
      { status: 500 }
    );
  }
}
