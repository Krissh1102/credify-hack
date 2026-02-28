import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
    try {
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { taxData } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json([
                {
                    title: "API Error",
                    insight: "Gemini API key is missing. Please configure it to enable AI insights.",
                },
            ]);
        }

        const prompt = `You are a highly intelligent, premium tax optimization Copilot for a user in India. 
Analyze the following user's tax data and provide 3-4 highly personalized, non-obvious, and "wow-factor" tax-saving strategies. 

Tax Profile:
- Annual Real Income: ₹${taxData.realIncome}
- Section 80C Deductions Currently Claimed: ₹${taxData.deductions.section80C.total} (PPF: ₹${taxData.deductions.section80C.breakdown.ppf}, FDs: ₹${taxData.deductions.section80C.breakdown.fd}, Mutual Funds/ELSS: ₹${taxData.deductions.section80C.breakdown.mf})
- Current Tax Liability (Old Regime): ₹${taxData.taxes.oldRegime}
- Current Tax Liability (New Regime): ₹${taxData.taxes.newRegime}
- Section 80D (Health Insurance): ₹${taxData.deductions.section80D || 0}
- HRA / Home Loan Interest Claimed: ₹${taxData.deductions.hraAndHomeLoan || 0}

Instructions:
1. Speak directly to the user in a professional, empathetic, and premium advisor tone.
2. If they haven't maxed out 80C (₹1.5L), suggest exactly how much more to invest and in what (ELSS for growth, PPF for safety).
3. Provide advanced strategies like Section 80D (Health Insurance for parents/self), Section 80CCD(1B) (NPS extra 50k), or HRA/Home Loan optimization if applicable.
4. Make the insights feel magical and incredibly personalized to their exact numbers.
5. Return your response ONLY as a valid JSON array of objects. Each object must have: 
   - "title" (a catchy, professional heading with an emoji)
   - "insight" (a 2-3 sentence description of the exact action to take and the exact money to save)
6. Do not include any markdown fences (like \`\`\`json) or other text. ONLY return the raw array.

Example Response:
[
  {
    "title": "📈 Maximize Your 80C with ELSS",
    "insight": "You are currently ₹45,000 short of your 1.5L Section 80C limit. Investing this in an ELSS Mutual Fund before March 31st will save you an additional ₹13,500 in taxes while building equity wealth."
  }
]`;

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const text = result.response.text();

            let cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonStart = cleanedText.indexOf('[');
            const jsonEnd = cleanedText.lastIndexOf(']');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
            }

            const insights = JSON.parse(cleanedText);
            return NextResponse.json(insights);
        } catch (aiError) {
            console.error("[GEMINI_GENERATION_ERROR]", aiError);
            return NextResponse.json([
                {
                    title: "💡 Use Tax-Free Allowances",
                    insight: "Consider structuring your salary to include Sodexo/Meal coupons, LTA, and internet allowances which are completely tax-free up to certain limits."
                },
                {
                    title: "🏥 Maximize Health Insurance (Sec 80D)",
                    insight: "Ensure you claim up to ₹25,000 for your family's premium and an additional ₹50,000 if you buy health insurance for senior citizen parents."
                }
            ]);
        }
    } catch (error) {
        console.error("[TAX_INSIGHTS_API_ERROR]", error);
        return NextResponse.json(
            [
                {
                    title: "🤖 Copilot Temporarily Unavailable",
                    insight: "Our AI Copilot is currently crunching numbers for other users. Please try again in a moment.",
                },
            ],
            { status: 500 }
        );
    }
}
