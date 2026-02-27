import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const loans = await db.loan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error("[LOANS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const body = await request.json();
    const {
      lender,
      type,
      principalAmount,
      interestRate,
      emiAmount,
      nextPaymentDate,
    } = body;

    const newLoan = await db.loan.create({
      data: {
        lender,
        type,
        principalAmount: parseFloat(principalAmount),
        outstandingBalance: parseFloat(principalAmount),
        interestRate: parseFloat(interestRate),
        emiAmount: emiAmount ? parseFloat(emiAmount) : null,
        nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : null,
        status: "ACTIVE",
        userId: user.id,
      },
    });

    return NextResponse.json(newLoan);
  } catch (error) {
    console.error("[LOANS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
