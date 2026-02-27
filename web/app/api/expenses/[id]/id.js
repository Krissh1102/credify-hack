import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// PUT: Update expense
export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const expense = await db.expense.update({
      where: { id: Number(params.id) },
      data: body
    });
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove expense
export async function DELETE(req, { params }) {
  try {
    await db.expense.delete({
      where: { id: Number(params.id) }
    });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
