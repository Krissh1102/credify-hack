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

    // Calculate current month's expenses and average monthly spending
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthExpenses = transactions
        .filter((t) => t.type === "EXPENSE" && new Date(t.date) >= currentMonthStart)
        .reduce((s, t) => s + Number(t.amount), 0);

    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsedInMonth = now.getDate();
    const projectedMonthlyExpense = (currentMonthExpenses / daysElapsedInMonth * daysInCurrentMonth).toFixed(2);

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
    const BRIEF = `You are a personal finance advisor. Respond ONLY in this exact format:
HEADLINE: <one short verdict sentence, max 12 words>
DETAIL: <one actionable sentence, max 20 words>
Start HEADLINE with a status emoji: 🟢 (healthy), 🟡 (needs attention), or 🔴 (critical). No other text.`;

    const CTX = `Income ₹${income} | Expenses ₹${expense} | Budget ${budget ? "₹" + Number(budget.amount).toFixed(0) : "not set"} | Total Account Balance ₹${totalBalance} | Top spend: ${topCategories || "none"}.`;

    // Perform math logic programmatically to prevent LLM hallucinations
    const isOverBudget = budget && Number(expense) > Number(budget.amount);
    const budgetCompletion = budget ? (Number(expense) / Number(budget.amount)) * 100 : 0;
    const isBudgetCritical = budgetCompletion >= 90; // 90%+ is critical
    const isBudgetWarning = budgetCompletion >= 70 && budgetCompletion < 90; // 70-89% is warning
    const hasHighBalance = (Number(totalBalance) + Number(income)) > (Number(expense) * 1.5);

    let MATH_WARNING;
    if (isOverBudget) {
        MATH_WARNING = `CRITICAL INSTRUCTION: You MUST start with 🔴. The user's expenses (₹${expense}) have EXCEEDED their budget (₹${Number(budget.amount).toFixed(0)}) by ${(budgetCompletion - 100).toFixed(1)}%. This is a critical situation requiring immediate action.`;
    } else if (isBudgetCritical) {
        MATH_WARNING = `CRITICAL INSTRUCTION: You MUST start with 🔴. The user's budget is at ${budgetCompletion.toFixed(1)}% completion. This is CRITICAL - they are dangerously close to exceeding their budget (₹${Number(budget.amount).toFixed(0)}). Recommend urgent spending cuts.`;
    } else if (isBudgetWarning) {
        MATH_WARNING = `CRITICAL INSTRUCTION: You MUST start with 🟡. The user's budget is at ${budgetCompletion.toFixed(1)}% completion. This is a WARNING - they are approaching their budget limit (₹${Number(budget.amount).toFixed(0)}). Recommend monitoring spending closely.`;
    } else if (hasHighBalance && !budget) {
        MATH_WARNING = `CRITICAL INSTRUCTION: You MUST start with 🟢. The user's total balance + income easily covers their expenses. They are in excellent financial shape. Do NOT give a critical or yellow warning.`;
    } else {
        MATH_WARNING = `CRITICAL INSTRUCTION: The user is within budget (${budgetCompletion.toFixed(1)}% used). Start with 🟢 or 🟡 based on their spending patterns and categories.`;
    }

    const prompts = {
        spending_analysis: `${BRIEF}

Data: ${CTX} Current month spent: ₹${currentMonthExpenses.toFixed(0)} in ${daysElapsedInMonth} days.
${MATH_WARNING}
Task: Give a spending verdict in the HEADLINE. Put one specific saving tip or praise in DETAIL.`,

        budget_prediction: (function () {
            const budgetAmt = budget ? Number(budget.amount) : 0;
            const projNum = Number(projectedMonthlyExpense);
            const projPct = budgetAmt ? (projNum / budgetAmt) * 100 : 0;

            let instruction;
            if (!budget) {
                instruction = `CRITICAL INSTRUCTION: Start with 🟡. No budget is set. Encourage the user to set one.`;
            } else if (projNum > budgetAmt) {
                instruction = `CRITICAL INSTRUCTION: Start with 🔴. Spending is ON TRACK TO EXCEED the budget. Projected ₹${projNum.toFixed(0)} vs budget ₹${budgetAmt.toFixed(0)}. Suggest cutting top expense categories.`;
            } else if (projPct >= 75) {
                instruction = `CRITICAL INSTRUCTION: Start with 🟡. Spending is approaching the limit — projected ₹${projNum.toFixed(0)} (${projPct.toFixed(0)}% of ₹${budgetAmt.toFixed(0)} budget). Advise monitoring closely.`;
            } else {
                instruction = `CRITICAL INSTRUCTION: Start with 🟢. Projected month spending is ₹${projNum.toFixed(0)}, only ${projPct.toFixed(0)}% of the ₹${budgetAmt.toFixed(0)} budget. This is EXCELLENT budget discipline. Praise the user and confirm they are well within limits.`;
            }

            return `${BRIEF}

Data: Income ₹${income} | Expenses so far ₹${currentMonthExpenses.toFixed(0)} in ${daysElapsedInMonth} days | Projected full-month ₹${projNum.toFixed(0)} | Budget ₹${budgetAmt.toFixed(0)} | Recurring expenses: ${recurringExpenses.length}.
${instruction}
Task: Put the budget projection verdict in HEADLINE. Put one specific trim tip or encouragement in DETAIL.`;
        })(),

        anomaly_detection: `${BRIEF}

Data: ${CTX}
Recent transactions (latest 20): ${transactions.slice(0, 20).map((t) => `${t.type} ₹${Number(t.amount).toFixed(0)} ${t.category}`).join(", ")}.
${MATH_WARNING}
Task: Put the anomaly verdict in HEADLINE (mention any unusual spike category). Put what to watch or confirm normal in DETAIL.`,

        future_expenditure: `${BRIEF}

Data: ${CTX}
Task: Put a one-phrase trajectory verdict in HEADLINE. Put the single biggest financial risk to watch next month in DETAIL.`,

        spending_leakage: `${BRIEF}

Data: ${CTX} Budget completion: ${budgetCompletion.toFixed(1)}%.
Recurring expenses: ${recurringExpenses.map((t) => `₹${Number(t.amount).toFixed(0)} ${t.description || t.category}`).join(", ") || "none"}.
${MATH_WARNING}
Task: Name the top leakage category in the HEADLINE. Give one concrete fix action in DETAIL.`,

        savings_rate: `${BRIEF}

Data: ${CTX} Budget completion: ${budgetCompletion.toFixed(1)}%. Savings jars: ${jarList || "none set"}.
${MATH_WARNING}
Task: State current savings posture in HEADLINE. Give one specific savings action in DETAIL.`,

        investment_health: `${BRIEF}

Data: Total invested ₹${totalInvested} across ${investments.length} investments: ${invList || "none"}. FDs: ${fixedDeposits.length}. PPF: ${ppfs.length ? "₹" + ppfs[ppfs.length - 1].balance : "none"}.
Task: State portfolio health verdict in HEADLINE. Give one actionable improvement in DETAIL.`,

        debt_optimization: `${BRIEF}

Data: Active loans: ${loanList || "none"}. Monthly EMI total: ₹${totalEmi}. Total outstanding: ₹${totalLoanBal}. Monthly income: ₹${income}.
Task: State debt burden verdict in HEADLINE. Name the best repayment tactic in DETAIL.`,

        subscription_audit: `${BRIEF}

Data: ${CTX} Budget completion: ${budgetCompletion.toFixed(1)}%.
Recurring/subscription expenses: ${transactions.filter((t) => t.type === "EXPENSE" && (t.isRecurring || /netflix|spotify|prime|gym|subscription|fee/i.test(t.description || ""))).slice(0, 15).map((t) => `₹${Number(t.amount).toFixed(0)} ${t.description || t.category}`).join(", ") || "none detected"}.
${MATH_WARNING}
Task: State subscription health verdict in HEADLINE. Call out the top subscription to review or cut in DETAIL.`,
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
                options: { temperature: 0.3, num_predict: 80 },
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
