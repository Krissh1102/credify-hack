"use client";

import React, { useEffect, useState, useMemo } from "react";
import { InvestDashBar } from "@/components/InvestDashBar";
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function CopilotFinancialContext({ loans, investments }) {
  const structuredData = useMemo(() => {
    if (!loans && !investments) return null;

    // 🔥 SAFELY CONVERT EVERYTHING TO NUMBER
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

    // ---- LOAN METRICS ----
    const totalDebt = cleanLoans.reduce(
      (sum, loan) => sum + loan.remainingAmount,
      0
    );

    const totalEMI = cleanLoans.reduce(
      (sum, loan) => sum + loan.emiAmount,
      0
    );

    const avgInterest =
      cleanLoans.length > 0
        ? cleanLoans.reduce((sum, loan) => sum + loan.interestRate, 0) /
        cleanLoans.length
        : 0;

    // ---- INVESTMENT METRICS ----
    const totalInvestments = cleanInvestments.reduce(
      (sum, inv) => sum + inv.amount,
      0
    );

    const investmentBreakdown = cleanInvestments.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + inv.amount;
      return acc;
    }, {});

    const netPosition = totalInvestments - totalDebt;

    return {
      loans: {
        count: cleanLoans.length,
        totalDebt,
        totalMonthlyEMI: totalEMI,
        averageInterestRate: Number(avgInterest.toFixed(2)),
      },
      investments: {
        count: cleanInvestments.length,
        totalValue: totalInvestments,
        breakdownByType: investmentBreakdown,
      },
      netPosition,
    };
  }, [loans, investments]);

  // Inject into Copilot
  useCopilotReadable({
    description:
      "Authenticated user's structured financial portfolio including loans, EMIs, interest rates, investments, and net position. All values are numeric and reliable.",
    value: structuredData,
  });

  return null;
}

export default function LoanGuideLayout({ children }) {
  const [open, setOpen] = useState(true);
  const [loans, setLoans] = useState([]);
  const [investments, setInvestments] = useState([]);

  useEffect(() => {
    async function fetchFinancialData() {
      try {
        const [loanRes, investmentRes] = await Promise.all([
          fetch("/api/loans", { credentials: "include" }),
          fetch("/api/investments", { credentials: "include" }),
        ]);

        if (loanRes.ok) {
          const loanData = await loanRes.json();
          setLoans(loanData);
        }

        if (investmentRes.ok) {
          const investmentData = await investmentRes.json();
          setInvestments(investmentData);
        }
      } catch (err) {
        console.error("Error fetching financial data:", err);
      }
    }

    fetchFinancialData();
  }, []);

  return (
    <CopilotKit publicApiKey="ck_pub_eafff044696b6c71b7d46f200be2efc2">
      <CopilotFinancialContext loans={loans} investments={investments} />

      <div className="flex h-screen pt-16">
        <InvestDashBar open={open} setOpen={setOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <CopilotPopup
        labels={{
          title: "Credify AI",
          initial: "Hi Ved 👋 Let’s optimize your portfolio.",
        }}
        instructions="
          You are Credify AI, a professional financial advisor.
          Use the structured numeric portfolio data provided.
          Give precise, number-based advice on:
          - Debt prioritization
          - Investment allocation
          - Net financial health
          - Risk balance between assets and liabilities
          Always reference actual numeric values.
        "
      />
    </CopilotKit>
  );
}