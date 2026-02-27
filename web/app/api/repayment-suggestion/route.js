import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Decimal } from "decimal.js";
import { db } from "@/lib/prisma";

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the specific loan details sent from the frontend
    const loanDetails = await req.json();
    if (!loanDetails.outstanding || !loanDetails.interestRate || !loanDetails.emi) {
      return new NextResponse("Missing loan details", { status: 400 });
    }

    // Fetch user's financial context from the database
    const user = await db.user.findUnique({
      where: { clerkUserId },
      include: {
        accounts: true,
        transactions: {
          where: {
            // Fetch last 3 months of data for analysis
            date: { gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) },
          },
        },
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // --- Process financial data for the AI ---
    const incomes = user.transactions.filter(t => t.type === 'INCOME');
    const expenses = user.transactions.filter(t => t.type === 'EXPENSE');

    const totalIncomeLast3Months = incomes.reduce((sum, t) => sum.add(t.amount.toString()), new Decimal(0));
    const totalExpensesLast3Months = expenses.reduce((sum, t) => sum.add(t.amount.toString()), new Decimal(0));
    
    const averageMonthlyIncome = totalIncomeLast3Months.div(3);
    const averageMonthlyExpenses = totalExpensesLast3Months.div(3);
    const disposableIncome = averageMonthlyIncome.minus(averageMonthlyExpenses);

    const totalLiquidAssets = user.accounts.reduce((sum, acc) => sum.add(acc.balance.toString()), new Decimal(0));

    const financialSummary = {
        averageMonthlyIncome: averageMonthlyIncome.toNumber(),
        averageMonthlyExpenses: averageMonthlyExpenses.toNumber(),
        estimatedDisposableIncome: disposableIncome.toNumber(),
        totalLiquidAssets: totalLiquidAssets.toNumber()
    };

    // --- Construct the Prompt for Gemini ---
    const prompt = `
      You are a cautious but encouraging financial advisor in India. A user wants a suggestion for an extra monthly payment on their loan.

      User's Financial Summary (3-month average):
      - Average Monthly Income: ₹${financialSummary.averageMonthlyIncome.toFixed(0)}
      - Average Monthly Expenses: ₹${financialSummary.averageMonthlyExpenses.toFixed(0)}
      - Estimated Monthly Disposable Income: ₹${financialSummary.estimatedDisposableIncome.toFixed(0)}
      - Total Savings/Liquid Assets: ₹${financialSummary.totalLiquidAssets.toFixed(0)}

      Loan Details:
      - Outstanding Balance: ₹${loanDetails.outstanding.toFixed(0)}
      - Interest Rate: ${loanDetails.interestRate}%
      - Current EMI: ₹${loanDetails.emi.toFixed(0)}

      Your Task:
      1. Analyze the user's disposable income.
      2. Suggest a single, realistic "extra monthly payment" amount. This amount should be a portion of their disposable income (e.g., 25-50%), ensuring they still have a buffer for savings and emergencies. The amount should be a round number, preferably a multiple of 500.
      3. Provide a brief, one-sentence reasoning for your suggestion.

      Return your response ONLY as a valid JSON object with two keys:
      - "suggestedExtraPayment": A number representing the suggested extra payment.
      - "reasoning": A string explaining your suggestion.

      Example Response:
      {
        "suggestedExtraPayment": 7500,
        "reasoning": "This amount accelerates your repayment without stretching your budget, leaving a good buffer for savings."
      }
    `;

    // --- Call Gemini API ---
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonResponse = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());

    return NextResponse.json(jsonResponse);

  } catch (error) {
    console.error("[REPAYMENT_SUGGESTION_API_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}