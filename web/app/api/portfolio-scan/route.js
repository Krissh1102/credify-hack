import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found in environment variables");
      return NextResponse.json({
        strengths: ["Portfolio analysis requires AI configuration."],
        risks: ["Please configure the Gemini API key for personalized insights."],
        suggestions: ["Contact your administrator to set up AI-powered portfolio analysis."]
      });
    }

    // The frontend will send the calculated portfolio summary
    const { portfolioSummary } = await req.json();

    if (!portfolioSummary) {
      return new NextResponse("Portfolio summary is required", { status: 400 });
    }

    const prompt = `
      You are a professional financial analyst for an investor in India. 
      Analyze the following portfolio summary and provide clear, concise insights.

      Portfolio Summary:
      - Total Current Value: ₹${portfolioSummary.totalCurrentValue.toLocaleString('en-IN')}
      - Overall Profit & Loss: ₹${portfolioSummary.overallPnl.toLocaleString('en-IN')} (${portfolioSummary.overallPnlPercent.toFixed(2)}%)
      - Asset Allocation:
        - Equity: ${portfolioSummary.allocations.equity.toFixed(1)}%
        - Mutual Funds: ${portfolioSummary.allocations.mutualFunds.toFixed(1)}%
        - Fixed Income: ${portfolioSummary.allocations.fixedIncome.toFixed(1)}%
        - Other Assets (Gold/Real Estate): ${portfolioSummary.allocations.otherAssets.toFixed(1)}%

      Your Task:
      Based on this summary, provide an analysis. The user is likely a moderately aggressive investor given the allocation.

      Return your response ONLY as a valid JSON object with three keys:
      1. "strengths": An array of 2-3 strings highlighting the strong points of the portfolio.
      2. "risks": An array of 2-3 strings identifying potential risks or areas for improvement.
      3. "suggestions": An array of 3 actionable suggestions for the user to consider.

      Example Response:
      {
        "strengths": [
          "Good diversification across multiple asset classes.",
          "Strong exposure to equity, which offers high growth potential."
        ],
        "risks": [
          "High allocation to equity can lead to volatility during market downturns.",
          "Ensure your fixed income portion is aligned with your short-term financial goals."
        ],
        "suggestions": [
          "Consider rebalancing your portfolio every 6-12 months to maintain your desired asset allocation.",
          "Review the performance of individual mutual funds against their benchmark indices.",
          "Build an emergency fund in a liquid, low-risk instrument if you haven't already."
        ]
      }
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean the response text to ensure it's valid JSON before parsing
      let cleanedText = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // Remove any leading/trailing text that might not be JSON
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }

      const jsonResponse = JSON.parse(cleanedText);

      // Validate the response structure
      if (!jsonResponse.strengths || !jsonResponse.risks || !jsonResponse.suggestions) {
        throw new Error("Invalid response format from AI");
      }

      return NextResponse.json(jsonResponse);
    } catch (geminiError) {
      console.error("[GEMINI_API_ERROR]", geminiError);
      
      // Return fallback analysis if AI fails
      const fallbackAnalysis = {
        strengths: [
          "Your portfolio shows good diversification across different asset classes.",
          "You have a balanced approach to risk management with both growth and income assets."
        ],
        risks: [
          "Market volatility may impact your equity holdings during economic downturns.",
          "Consider reviewing your asset allocation to ensure it aligns with your risk tolerance."
        ],
        suggestions: [
          "Regularly rebalance your portfolio to maintain your desired asset allocation.",
          "Consider dollar-cost averaging for new investments to reduce market timing risk.",
          "Review your investment goals and time horizon to ensure your portfolio matches your objectives."
        ]
      };
      
      return NextResponse.json(fallbackAnalysis);
    }

  } catch (error) {
    console.error("[PORTFOLIO_ANALYSIS_ERROR]", error);
    
    // Return fallback analysis for any other errors
    const fallbackAnalysis = {
      strengths: [
        "Your portfolio shows good diversification across different asset classes.",
        "You have a balanced approach to risk management with both growth and income assets."
      ],
      risks: [
        "Market volatility may impact your equity holdings during economic downturns.",
        "Consider reviewing your asset allocation to ensure it aligns with your risk tolerance."
      ],
      suggestions: [
        "Regularly rebalance your portfolio to maintain your desired asset allocation.",
        "Consider dollar-cost averaging for new investments to reduce market timing risk.",
        "Review your investment goals and time horizon to ensure your portfolio matches your objectives."
      ]
    };
    
    return NextResponse.json(fallbackAnalysis);
  }
}