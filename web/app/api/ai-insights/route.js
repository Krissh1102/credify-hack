import { NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5:7b";

// ─── Prompt Templates ────────────────────────────────────────────────────────

function buildPrompt(insightType, data) {
    const {
        transactions = [], loans = [], investments = [], savingsJars = [],
        budget, ppfs = [], fixedDeposits = [], bonds = [], realEstates = [],
        golds = [], accounts = [],
    } = data;

    const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0).toFixed(2);
    const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0).toFixed(2);
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0).toFixed(2);

    const categoryBreakdown = transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc; }, {});

    const topCategories = Object.entries(categoryBreakdown)
        .sort(([, a], [, b]) => b - a).slice(0, 3)
        .map(([cat, amt]) => `${cat} ₹${amt.toFixed(0)}`).join(", ");

    const recurringExpenses = transactions.filter((t) => t.type === "EXPENSE" && t.isRecurring);
    const totalEmi = loans.filter((l) => l.status === "ACTIVE").reduce((s, l) => s + Number(l.emiAmount), 0).toFixed(2);
    const totalLoanBal = loans.filter((l) => l.status === "ACTIVE").reduce((s, l) => s + Number(l.outstandingBalance), 0).toFixed(2);
    const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0).toFixed(2);

    const loanList = loans.filter((l) => l.status === "ACTIVE")
        .map((l) => `${l.name}(${l.lender}) ₹${Number(l.outstandingBalance).toFixed(0)} @${Number(l.interestRate).toFixed(1)}% EMI ₹${Number(l.emiAmount).toFixed(0)}`).join("; ");

    const invList = investments.map((i) => `${i.name}[${i.type}] ₹${Number(i.amount).toFixed(0)}`).join("; ");

    const jarList = savingsJars.map((j) => `${j.name}: ₹${Number(j.currentAmount).toFixed(0)}/₹${Number(j.targetAmount).toFixed(0)}`).join("; ");

    // Shared concise instruction for ALL prompts
    const BRIEF = `You are a strict, concise personal finance advisor. Reply in EXACTLY 2 to 3 average length sentences (max 40 words total). Start with a status emoji: 🟢 (healthy), 🟡 (needs attention), or 🔴 (critical). No bullet points, no headers, no markdown.`;

    const CTX = `Income ₹${income} | Expenses ₹${expense} | Budget ${budget ? "₹" + Number(budget.amount).toFixed(0) : "not set"} | Total Account Balance ₹${totalBalance} | Top spend: ${topCategories || "none"}.`;

    // Perform math logic programmatically to prevent LLM hallucinations
    const isOverBudget = budget && Number(expense) > Number(budget.amount);
    const hasHighBalance = (Number(totalBalance) + Number(income)) > (Number(expense) * 1.5);

    const MATH_WARNING = isOverBudget
        ? `CRITICAL INSTRUCTION: You MUST start with 🔴. The user's expenses (₹${expense}) have EXCEEDED their budget (₹${Number(budget.amount).toFixed(0)}). Mention this overspend immediately.`
        : hasHighBalance
            ? `CRITICAL INSTRUCTION: You MUST start with 🟢. The user's total balance + income easily covers their expenses. They are well UNDER budget and in excellent financial shape. Do NOT give a critical or yellow warning.`
            : `CRITICAL INSTRUCTION: The user is within budget. Start with 🟢 or 🟡 based on their top categories.`;

    const prompts = {
        spending_analysis: `${BRIEF}

Data: ${CTX}
${MATH_WARNING}
Task: Give a 2-3 sentence spending health verdict.`,

        budget_prediction: `${BRIEF}

Data: ${CTX} Recurring expenses count: ${recurringExpenses.length}.
${MATH_WARNING}
Task: Predict next month's total spending in 2-3 sentences and say whether it will breach the budget. If it will exceed the budget, explicitly suggest 1-2 specific areas to reduce spending based on their top spend categories.`,

        anomaly_detection: `${BRIEF}

Data: ${CTX}
Recent transactions (latest 20): ${transactions.slice(0, 20).map((t) => `${t.type} ₹${Number(t.amount).toFixed(0)} ${t.category}`).join(", ")}.
Task: In 2-3 sentences, flag any unusual or anomalous spending patterns. If none are found and balance is high, start with 🟢 and state everything looks normal.`,

        future_expenditure: `${BRIEF}

Data: ${CTX}
Task: In 2-3 sentences, project the user's financial trajectory over the next month and highlight the main risk.`,

        spending_leakage: `${BRIEF}

Data: ${CTX}
Recurring expenses: ${recurringExpenses.map((t) => `₹${Number(t.amount).toFixed(0)} ${t.description || t.category}`).join(", ") || "none"}.
Task: In 2-3 sentences, identify the biggest spending leakage and what to do about it. If expenses are low compared to income/balance, start with 🟢 and state there is minimal leakage.`,

        investment_health: `${BRIEF}

Data: Total invested ₹${totalInvested} across ${investments.length} investments: ${invList || "none"}. FDs: ${fixedDeposits.length}. PPF: ${ppfs.length ? "₹" + ppfs[ppfs.length - 1].balance : "none"}.
Task: In 2-3 sentences, assess portfolio health and give one actionable improvement.`,

        debt_optimization: `${BRIEF}

Data: Active loans: ${loanList || "none"}. Monthly EMI total: ₹${totalEmi}. Total outstanding: ₹${totalLoanBal}. Monthly income: ₹${income}.
Task: In 2-3 sentences, assess debt burden and recommend the best repayment approach.`,

        savings_rate: `${BRIEF}

Data: ${CTX} Savings jars: ${jarList || "none set"}.
Task: In 2-3 sentences, state the current savings rate percentage and give one specific tip to improve it.`,

        subscription_audit: `${BRIEF}

Data: ${CTX}
Recurring/subscription expenses: ${transactions.filter((t) => t.type === "EXPENSE" && (t.isRecurring || /netflix|spotify|prime|gym|subscription|fee/i.test(t.description || ""))).slice(0, 15).map((t) => `₹${Number(t.amount).toFixed(0)} ${t.description || t.category}`).join(", ") || "none detected"}.
${MATH_WARNING}
Task: In 2-3 sentences, summarize the subscription situation. If the user is EXCEEDING their budget (🔴), you MUST explicitly point this out and suggest immediately auditing/cutting these subscriptions to save money, even if the subscription amount seems small.`,
    };

    return prompts[insightType] || prompts.spending_analysis;
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function POST(request) {
    try {
        const { insightType, data } = await request.json();

        if (!insightType || !data) {
            return NextResponse.json({ error: "Missing insightType or data" }, { status: 400 });
        }

        const prompt = buildPrompt(insightType, data);

        const ollamaRes = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL,
                prompt,
                stream: true,
                options: { temperature: 0.6, num_predict: 120 },
            }),
        });

        if (!ollamaRes.ok) {
            const errText = await ollamaRes.text();
            return NextResponse.json({ error: `Ollama error: ${errText}` }, { status: 502 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                const reader = ollamaRes.body.getReader();
                const decoder = new TextDecoder();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        for (const line of chunk.split("\n").filter(Boolean)) {
                            try {
                                const json = JSON.parse(line);
                                if (json.response) controller.enqueue(new TextEncoder().encode(json.response));
                                if (json.done) { controller.close(); return; }
                            } catch { /* skip */ }
                        }
                    }
                } catch (err) {
                    controller.error(err);
                } finally {
                    reader.releaseLock();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (err) {
        console.error("[ai-insights] Error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
