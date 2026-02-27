import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Decimal } from "decimal.js";
import { db } from "@/lib/prisma";

/**
 * Main GET handler for fetching AI-powered debt insights.
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.log("No user ID found, returning 401");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found in environment variables");
      return NextResponse.json([
        {
          title: "API Configuration Required",
          insight: "Please configure the Gemini API key to enable AI-powered insights. Contact your administrator to set up the GEMINI_API_KEY environment variable."
        }
      ]);
    }

    const user = await db.user.findUnique({
      where: { clerkUserId },
      include: {
        loans: { where: { status: "ACTIVE" } },
        accounts: true,
        transactions: {
          where: {
            date: {
              // Fetch last 6 months of transactions for income analysis
              gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
          },
          orderBy: { date: "desc" },
        },
        investments: true,
        fixedDeposits: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // --- Process Data for the AI Prompt ---
    const totalDebt = user.loans.reduce(
      (sum, loan) => sum.add(loan.outstandingBalance.toString()),
      new Decimal(0)
    );
    const totalMonthlyPayments = user.loans.reduce(
      (sum, loan) => sum.add(loan.emiAmount.toString()),
      new Decimal(0)
    );

    const monthlyIncomes = user.transactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => {
        const monthYear = t.date.toISOString().slice(0, 7); // Format as YYYY-MM
        if (!acc[monthYear]) {
          acc[monthYear] = new Decimal(0);
        }
        acc[monthYear] = acc[monthYear].add(t.amount.toString());
        return acc;
      }, {});

    const incomeValues = Object.values(monthlyIncomes);
    const averageMonthlyIncome =
      incomeValues.length > 0
        ? incomeValues
            .reduce((sum, income) => sum.add(income), new Decimal(0))
            .div(incomeValues.length)
        : new Decimal(0);

    const totalAssets = user.accounts
      .reduce((sum, acc) => sum.add(acc.balance.toString()), new Decimal(0))
      .add(
        user.investments.reduce(
          (sum, inv) => sum.add(inv.amount.toString()),
          new Decimal(0)
        )
      )
      .add(
        user.fixedDeposits.reduce(
          (sum, fd) => sum.add(fd.principal.toString()),
          new Decimal(0)
        )
      );

    // Create a simplified summary object for the AI
    const financialSummary = {
      totalDebt: totalDebt.toNumber(),
      totalMonthlyEMIPayments: totalMonthlyPayments.toNumber(),
      averageMonthlyIncome: averageMonthlyIncome.toNumber(),
      debtToIncomeRatio: averageMonthlyIncome.isZero()
        ? 0
        : totalMonthlyPayments.div(averageMonthlyIncome).mul(100).toNumber(),
      totalLiquidAssets: user.accounts
        .reduce((sum, acc) => sum.add(acc.balance.toString()), new Decimal(0))
        .toNumber(),
      totalAssets: totalAssets.toNumber(),
      activeLoans: user.loans.map((loan) => ({
        type: loan.type,
        outstandingBalance: Number(loan.outstandingBalance),
        interestRate: Number(loan.interestRate),
        emiAmount: Number(loan.emiAmount),
      })),
    };

    // --- Construct the Prompt for Gemini ---
    const prompt = `You are an expert financial advisor for a user in India.
Analyze the following financial summary and provide 2-3 concise, actionable, and encouraging insights to help them manage their debt.

Financial Summary:
${JSON.stringify(financialSummary, null, 2)}

Instructions:
1. Focus on high-impact advice. Suggest specific strategies like the debt avalanche method (focusing on high-interest loans) or debt snowball (focusing on smallest balances).
2. Mention refinancing opportunities if they have high-interest loans and their DTI ratio is reasonable (e.g., under 40-45%).
3. Keep the tone positive and empowering.
4. Return your response ONLY as a valid JSON array of objects. Each object must have two keys: "title" (a short heading) and "insight" (a 1-2 sentence description).
5. Do not include any other text, greetings, or markdown formatting outside of the JSON array.

Example Response Format:
[
  {
    "title": "Tackle High-Interest Debt",
    "insight": "Your Personal Loan has a high interest rate. Consider making extra payments towards it to save significantly on interest over time."
  },
  {
    "title": "Explore Refinancing",
    "insight": "Your overall financial health looks stable. You could be eligible to refinance your Auto Loan at a lower interest rate, which would reduce your monthly EMI."
  }
]`;

    // --- Call Gemini API and Return Response ---
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Clean the response text to ensure it's valid JSON before parsing
      let cleanedText = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // Remove any leading/trailing text that might not be JSON
      const jsonStart = cleanedText.indexOf('[');
      const jsonEnd = cleanedText.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }

      const jsonResponse = JSON.parse(cleanedText);

      // Validate the response structure
      if (!Array.isArray(jsonResponse)) {
        throw new Error("Invalid response format from AI");
      }

      // Ensure each insight has the required structure
      const validatedInsights = jsonResponse
        .filter(insight => insight && typeof insight.title === 'string' && typeof insight.insight === 'string')
        .slice(0, 3); // Limit to 3 insights

      if (validatedInsights.length === 0) {
        throw new Error("No valid insights generated");
      }

      return NextResponse.json(validatedInsights);
    } catch (geminiError) {
      console.error("[GEMINI_API_ERROR]", geminiError);
      
      // Return fallback insights based on the financial data
      const fallbackInsights = generateFallbackInsights(financialSummary);
      return NextResponse.json(fallbackInsights);
    }
  } catch (error) {
    console.error("[DEBT_INSIGHTS_API_ERROR]", error);
    
    // Return a generic error response
    return NextResponse.json([
      {
        title: "Service Temporarily Unavailable",
        insight: "We're experiencing technical difficulties with our AI insights service. Please try again later or contact support if the issue persists."
      }
    ], { status: 500 });
  }
}

/**
 * Generates rule-based fallback insights if the AI service fails.
 * @param {object} financialSummary The user's calculated financial summary.
 * @returns {Array<object>} An array of insight objects.
 */
function generateFallbackInsights(financialSummary) {
  const insights = [];
  const dti = financialSummary.debtToIncomeRatio.toFixed(1);
  
  // DTI ratio insights
  if (financialSummary.debtToIncomeRatio > 40) {
    insights.push({
      title: "High Debt-to-Income Ratio",
      insight: `Your debt-to-income ratio is ${dti}%. Consider increasing your income or reducing expenses to improve your financial health.`
    });
  } else if (financialSummary.debtToIncomeRatio > 0 && financialSummary.debtToIncomeRatio <= 35) {
    insights.push({
      title: "Healthy Debt-to-Income Ratio",
      insight: `Your debt-to-income ratio of ${dti}% is within a healthy range. Keep up the good work!`
    });
  }
  
  // High-interest debt insights
  const highInterestLoans = financialSummary.activeLoans.filter((loan) => loan.interestRate > 12);
  if (highInterestLoans.length > 0) {
    insights.push({
      title: "Focus on High-Interest Debt",
      insight: `You have ${highInterestLoans.length} loan(s) with interest rates above 12%. Consider paying these off first using the debt avalanche method to save on interest.`
    });
  }
  
  // Refinancing opportunity
  if (financialSummary.debtToIncomeRatio < 40 && financialSummary.activeLoans.some((loan) => loan.interestRate > 10)) {
    insights.push({
      title: "Consider Refinancing",
      insight: "With your current financial position, you may be eligible for loan refinancing at lower interest rates, which could reduce your monthly payments."
    });
  }
  
  // If no specific insights, provide general advice
  if (insights.length === 0) {
    insights.push({
      title: "Review Your Financials",
      insight: "Continue making regular payments on your debts. Consider creating a budget to track expenses and find opportunities to save."
    });
  }
  
  return insights.slice(0, 3); // Return a maximum of 3 insights
}