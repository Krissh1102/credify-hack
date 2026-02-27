"use server";

import { db } from "@/lib/prisma";
import { subDays, eachDayOfInterval, format } from "date-fns";

const CLERK_USER_ID = "user_3AEzM9qmtHizNL3lfJZEy1WNY1Q";

// Categories with their typical amount ranges
const CATEGORIES = {
  INCOME: [
    { name: "salary", range: [80000, 120000] },
    { name: "freelance", range: [5000, 15000] },
    { name: "investments", range: [2000, 10000] },
    { name: "other-income", range: [500, 5000] },
  ],
  EXPENSE: [
    { name: "housing", range: [25000, 45000] },
    { name: "transportation", range: [1000, 5000] },
    { name: "groceries", range: [2000, 8000] },
    { name: "utilities", range: [2000, 6000] },
    { name: "entertainment", range: [1000, 5000] },
    { name: "food", range: [500, 2000] },
    { name: "shopping", range: [2000, 15000] },
    { name: "healthcare", range: [500, 5000] },
    { name: "education", range: [1000, 10000] },
    { name: "travel", range: [5000, 50000] },
  ],
};

function getRandomAmount(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function getRandomCategory(type) {
  const categories = CATEGORIES[type];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const amount = getRandomAmount(category.range[0], category.range[1]);
  return { category: category.name, amount };
}

export async function seedTransactions() {
  try {
    // 1. Get or Create User
    const user = await db.user.upsert({
      where: { clerkUserId: CLERK_USER_ID },
      update: {},
      create: {
        clerkUserId: CLERK_USER_ID,
        email: `user_${CLERK_USER_ID}@example.com`,
        name: "Test User",
      },
    });

    // 2. Get or Create Account
    let account = await db.account.findFirst({
      where: { userId: user.id },
    });

    if (!account) {
      account = await db.account.create({
        data: {
          name: "Main Savings",
          type: "SAVINGS",
          balance: 100000,
          isDefault: true,
          userId: user.id,
        },
      });
    }

    const USER_ID = user.id;
    const ACCOUNT_ID = account.id;

    // Generate 90 days of transactions
    const transactions = [];
    let currentBalance = Number(account.balance);

    const now = new Date();
    const startDate = subDays(now, 90);
    const days = eachDayOfInterval({ start: startDate, end: now });

    for (const day of days) {
      const dayNum = day.getDate();

      // Monthly Salary
      if (dayNum === 1) {
        const amount = getRandomAmount(80000, 120000);
        transactions.push({
          id: crypto.randomUUID(),
          type: "INCOME",
          amount,
          description: "Monthly Salary",
          date: day,
          category: "salary",
          status: "COMPLETED",
          userId: USER_ID,
          accountId: ACCOUNT_ID,
        });
        currentBalance += amount;
      }

      // Rent/Housing
      if (dayNum === 5) {
        const amount = getRandomAmount(25000, 35000);
        transactions.push({
          id: crypto.randomUUID(),
          type: "EXPENSE",
          amount,
          description: "Monthly Rent",
          date: day,
          category: "housing",
          status: "COMPLETED",
          userId: USER_ID,
          accountId: ACCOUNT_ID,
        });
        currentBalance -= amount;
      }

      // Daily transactions
      const numTransactions = Math.floor(Math.random() * 4) + 1; // 1-4 per day
      for (let j = 0; j < numTransactions; j++) {
        // Skip some days to make it more natural
        if (Math.random() < 0.2) continue;

        const type = Math.random() < 0.1 ? "INCOME" : "EXPENSE"; // Mostly expenses
        const { category, amount } = getRandomCategory(type);

        transactions.push({
          id: crypto.randomUUID(),
          type,
          amount,
          description: `${type === "INCOME" ? "Refund/Credit" : "Purchase"} - ${category}`,
          date: day,
          category,
          status: "COMPLETED",
          userId: USER_ID,
          accountId: ACCOUNT_ID,
        });
        currentBalance += type === "INCOME" ? amount : -amount;
      }
    }

    await db.$transaction(async (tx) => {
      // Clear existing
      await tx.transaction.deleteMany({ where: { userId: USER_ID } });
      await tx.loan.deleteMany({ where: { userId: USER_ID } });
      await tx.investment.deleteMany({ where: { userId: USER_ID } });
      await tx.savingsJar.deleteMany({ where: { userId: USER_ID } });

      // Insert new transactions
      await tx.transaction.createMany({ data: transactions });

      // Update balance
      await tx.account.update({
        where: { id: ACCOUNT_ID },
        data: { balance: currentBalance },
      });

      // Seed Loans
      await tx.loan.createMany({
        data: [
          {
            name: "Car Loan",
            lender: "HDFC Bank",
            type: "AUTO",
            principalAmount: 800000,
            outstandingBalance: 450000,
            interestRate: 8.5,
            tenureInMonths: 60,
            emiAmount: 16500,
            issueDate: subDays(now, 365),
            userId: USER_ID,
          },
          {
            name: "Home Loan",
            lender: "SBI",
            type: "HOME",
            principalAmount: 5000000,
            outstandingBalance: 4200000,
            interestRate: 9.2,
            tenureInMonths: 240,
            emiAmount: 45000,
            issueDate: subDays(now, 730),
            userId: USER_ID,
          }
        ]
      });

      // Seed Investments
      await tx.investment.createMany({
        data: [
          { name: "Nifty 50 Index Fund", type: "MUTUAL_FUNDS", amount: 200000, date: subDays(now, 100), userId: USER_ID },
          { name: "Reliance Industries", type: "STOCKS", amount: 50000, date: subDays(now, 50), userId: USER_ID },
          { name: "Bitcoin", type: "CRYPTO", amount: 25000, date: subDays(now, 20), userId: USER_ID },
        ]
      });

      // Seed Savings Jars
      await tx.savingsJar.createMany({
        data: [
          { name: "Emergency Fund", targetAmount: 500000, currentAmount: 250000, userId: USER_ID },
          { name: "Vacation", targetAmount: 100000, currentAmount: 40000, goalDate: subDays(now, -200), userId: USER_ID },
        ]
      });
    });

    return {
      success: true,
      message: `Successfully seeded data for user ${CLERK_USER_ID}. Created ${transactions.length} transactions, 2 loans, 3 investments, and 2 savings jars.`,
    };
  } catch (error) {
    console.error("Error seeding transactions:", error);
    return { success: false, error: error.message };
  }
}
