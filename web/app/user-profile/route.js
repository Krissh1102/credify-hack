import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// This API returns the user's profile data for debt analytics
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the user in your database
    const user = await db.user.findUnique({
      where: { clerkUserId },
    });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Calculate total assets and monthly income from accounts
    const accounts = await db.account.findMany({ where: { userId: user.id } });
    const totalAssets = accounts.reduce(
      (sum, acc) => sum + Number(acc.balance),
      0
    );
    // Estimate monthly income as 1/12th of total assets (or use a better method if available)
    let monthlyIncome = user.monthlyIncome;
    if (!monthlyIncome || monthlyIncome <= 0) {
      monthlyIncome = totalAssets > 0 ? Math.round(totalAssets / 12) : 80000;
    }
    // Credit score: if missing, return a message to prompt user to provide it
    let creditScore = user.creditScore;
    let creditScoreMissing = false;
    if (!creditScore || creditScore <= 0) {
      creditScoreMissing = true;
      creditScore = null;
    }

    // Calculate debt-to-income and debt-to-assets ratios dynamically
    // Get all active loans for the user
    const loans = await db.loan.findMany({
      where: { userId: user.id, status: "ACTIVE" },
    });
    const totalDebt = loans.reduce(
      (sum, l) => sum + Number(l.outstandingBalance),
      0
    );
    const totalMonthlyPayments = loans.reduce(
      (sum, l) => sum + Number(l.emiAmount),
      0
    );
    const dtiRatio =
      monthlyIncome > 0 ? (totalMonthlyPayments / monthlyIncome) * 100 : 0;
    const debtToAssetsRatio =
      totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;

    return NextResponse.json({
      monthlyIncome,
      totalAssets,
      creditScore,
      creditScoreMissing,
      dtiRatio,
      debtToAssetsRatio,
      totalDebt,
      totalMonthlyPayments,
    });
  } catch (error) {
    console.error("[USER_PROFILE_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
