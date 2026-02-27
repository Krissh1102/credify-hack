import { NextResponse } from "next/server";

/**
 * Simple POST handler that accepts a portfolioSummary and returns
 * a deterministic, lightweight analysis object with strengths,
 * risks and suggestions. This avoids 404/HTML responses while you
 * iterate on connecting a real AI service.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const summary = body.portfolioSummary || {};

    // Generate a small deterministic analysis based on numbers provided
    const total = Number(summary.totalCurrentValue || 0);
    const invested = Number(summary.totalInvested || 0);
    const pnlPercent = invested > 0 ? ((total - invested) / invested) * 100 : 0;

    const strengths = [];
    const risks = [];
    const suggestions = [];

    if (pnlPercent >= 10)
      strengths.push(
        "Your portfolio shows healthy gains (over 10%). Keep disciplined investing."
      );
    else if (pnlPercent >= 0)
      strengths.push("Your portfolio is stable with no major losses.");
    else
      risks.push(
        "Overall portfolio is currently in loss. Consider rebalancing and reviewing high-risk holdings."
      );

    if (summary.allocations && summary.allocations.equity > 60) {
      risks.push("High equity allocation increases volatility risk.");
      suggestions.push(
        "Consider shifting some allocation to fixed income to reduce volatility."
      );
    } else {
      strengths.push("Asset allocation appears balanced.");
    }

    if (summary.allocations && summary.allocations.fixedIncome < 10) {
      suggestions.push(
        "Add some fixed-income instruments (FDs, bonds) to improve stability and cashflow."
      );
    }

    if (!suggestions.length)
      suggestions.push(
        "Maintain regular SIPs and review fees/tax efficiency to improve long-term returns."
      );

    const analysis = {
      strengths,
      risks,
      suggestions,
    };

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 400 }
    );
  }
}
