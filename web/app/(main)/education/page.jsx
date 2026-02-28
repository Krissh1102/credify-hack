"use client";

import React, { useEffect, useState, useMemo } from "react";
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function CopilotFinancialContext({ loans, investments }) {
    const structuredData = useMemo(() => {
        const cleanLoans =
            loans?.map((loan) => ({
                type: loan.type,
                remainingAmount: Number(loan.remainingAmount || 0),
                interestRate: Number(loan.interestRate || 0),
                emiAmount: Number(loan.emiAmount || 0),
            })) || [];

        const cleanInvestments =
            investments?.map((inv) => ({
                name: inv.name,
                type: inv.type,
                amount: Number(inv.amount || 0),
            })) || [];

        const totalDebt = cleanLoans.reduce(
            (sum, loan) => sum + loan.remainingAmount,
            0
        );

        const totalEMI = cleanLoans.reduce(
            (sum, loan) => sum + loan.emiAmount,
            0
        );

        const totalInvestments = cleanInvestments.reduce(
            (sum, inv) => sum + inv.amount,
            0
        );

        const netPosition = totalInvestments - totalDebt;

        return {
            loans: {
                count: cleanLoans.length,
                totalDebt,
                totalMonthlyEMI: totalEMI,
            },
            investments: {
                count: cleanInvestments.length,
                totalValue: totalInvestments,
            },
            netPosition,
        };
    }, [loans, investments]);

    useCopilotReadable({
        description:
            "User financial portfolio including loans, investments, and net position. Use this for personalized financial advice.",
        value: structuredData,
    });

    return null;
}

export default function FinancialChatPage() {
    const [loans, setLoans] = useState([]);
    const [investments, setInvestments] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [loanRes, investmentRes] = await Promise.all([
                    fetch("/api/loans", { credentials: "include" }),
                    fetch("/api/investments", { credentials: "include" }),
                ]);

                if (loanRes.ok) setLoans(await loanRes.json());
                if (investmentRes.ok) setInvestments(await investmentRes.json());
            } catch (err) {
                console.error(err);
            }
        }

        fetchData();
    }, []);

    return (
        <CopilotKit publicApiKey="ck_pub_0261db02374b586d16ed9098686a0444">
            <CopilotFinancialContext loans={loans} investments={investments} />

            <div className="h-screen w-screen">
                <CopilotChat
                    className="h-full w-full"
                    labels={{
                        title: "Credify AI Financial Assistant",
                        initial:
                            "Hi Ved 👋 Welcome to Credify AI.\n\nHow may I help you today?\n\nI can:\n• Analyze your loans\n• Review your investments\n• Check your financial health\n• Suggest repayment strategies\n• Compare invest vs repay decisions",
                    }}
                    suggestions={[
                        { label: "Analyze my financial health" },
                        { label: "Should I repay loans or invest more?" },
                        { label: "How can I reduce my EMI?" },
                        { label: "Am I financially stable?" },
                    ]}
                    instructions="
            You are Credify AI, a professional yet friendly financial advisor.
            Greet the user warmly.
            Use the structured numeric portfolio data provided.
            Always reference actual financial numbers.
            Give clear, concise, actionable advice.
            Maintain a helpful chatbot tone.
          "
                />
            </div>
        </CopilotKit>
    );
}