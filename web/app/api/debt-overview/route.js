import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return new NextResponse("Unauthorized", { status: 401 });

    // Fetch user with loans
    const user = await db.user.findUnique({
      where: { clerkUserId },
      include: { loans: true },
    });

    if (!user) return new NextResponse("User not found", { status: 404 });

    // Default values if not set
    const monthlyIncome = user.monthlyIncome || 0;
    const totalAssets = user.totalAssets || 0;
    const creditScore = user.creditScore || 0;

    // Map active loans dynamically
    const activeLoans = user.loans.map((loan) => ({
      id: loan.id,
      type: loan.type,
      lender: loan.lender,
      outstanding: loan.outstandingBalance,
      totalAmount: loan.principalAmount,
      monthlyPayment: loan.monthlyPayment || 0,
      interestRate: loan.interestRate,
      payoffYear: loan.payoffYear || new Date().getFullYear() + 5,
    }));

    // Dynamic debt history (based on actual loans, simplistic calculation)
    const currentYear = new Date().getFullYear();
    const debtHistory = [];
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      const balance = activeLoans.reduce((sum, l) => sum + l.outstanding, 0);
      debtHistory.push({ year, balance });
    }

    // Return fully dynamic data
    return NextResponse.json({
      monthlyIncome,
      totalAssets,
      creditScore,
      activeLoans,
      debtHistory,
    });
  } catch (error) {
    console.error("[DEBT_OVERVIEW]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
