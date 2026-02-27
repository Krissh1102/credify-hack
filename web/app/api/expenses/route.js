import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// GET: Fetch all expenses
export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      orderBy: { date: "asc" }
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add expense
export async function POST(req) {
  try {
    const body = await req.json();
    const expense = await db.expense.create({ data: body });
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
