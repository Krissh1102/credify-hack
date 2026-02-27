"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { checkUser } from "@/lib/checkUser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { subDays, startOfMonth } from "date-fns";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getCurrentBudget(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) {
      throw new Error("User not found");
    }

    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,
      },
    });

    const currentDate = new Date();
    const startOfCurrentMonth = startOfMonth(currentDate);

    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: startOfCurrentMonth,
          lte: endOfMonth,
        },
        accountId,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}

export async function updateBudget(amount) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount,
      },
      create: {
        userId: user.id,
        amount,
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }
}

export async function getBudgetRecommendation() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    // 1. Fetch Transactions (Last 90 days)
    const transactions = await db.transaction.findMany({
      where: { userId: user.id, date: { gte: subDays(new Date(), 90) } },
      select: { amount: true, type: true, category: true, date: true },
    });

    // 2. Fetch Loans
    const loans = await db.loan.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { emiAmount: true, type: true, name: true },
    });

    // 3. Fetch Investments
    const investments = await db.investment.findMany({
      where: { userId: user.id },
      select: { amount: true, type: true, name: true },
    });

    // 4. Fetch Accounts for Balance
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      select: { balance: true, name: true },
    });

    const userData = {
      transactions: transactions.map(t => ({ ...t, amount: t.amount.toNumber() })),
      loans: loans.map(l => ({ ...l, emiAmount: l.emiAmount.toNumber() })),
      investments: investments.map(i => ({ ...i, amount: i.amount.toNumber() })),
      accounts: accounts.map(a => ({ ...a, balance: a.balance.toNumber() })),
    };

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a professional financial advisor. Analyze the following user data and suggest a realistic monthly budget.
      
      User Data:
      - Transactions (last 90 days): ${JSON.stringify(userData.transactions)}
      - Loans (Monthly EMI obligations): ${JSON.stringify(userData.loans)}
      - Investments (Current Portfolio): ${JSON.stringify(userData.investments)}
      - Cash Balance (Across accounts): ${JSON.stringify(userData.accounts)}

      Guidelines:
      1. Calculate average monthly income and regular expenses.
      2. Factor in loan EMIs as mandatory fixed costs.
      3. Recommend a portion for savings/investments (ideally 20% if feasible).
      4. Suggest a "Safe Spending" monthly budget that covers necessities + some discretionary spending but keeps them within their means.
      5. Provide a clear, encouraging explanation for the suggested amount.

      Respond ONLY with valid JSON in this format:
      {
        "suggestedAmount": number,
        "explanation": "string",
        "breakdown": {
          "fixedCosts": number,
          "savings": number,
          "discretionary": number
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    const recommendation = JSON.parse(cleanedText);

    return {
      success: true,
      recommendation
    };
  } catch (error) {
    console.error("AI Budget Recommendation Error:", error);
    return { success: false, error: error.message };
  }
}
