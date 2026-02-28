"use client";

import React, { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import { LoanSideBar } from "@/components/LoanSideBar";
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function CopilotLoanContext({ loans }) {
  const structuredData = useMemo(() => {
    if (!loans || loans.length === 0) return null;

    const cleanLoans = loans.map((loan) => ({
      type: loan.type,
      remainingAmount: Number(loan.remainingAmount || 0),
      interestRate: Number(loan.interestRate || 0),
      emiAmount: Number(loan.emiAmount || 0),
    }));

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

    const highestInterestLoan = cleanLoans.reduce((max, loan) =>
      loan.interestRate > (max?.interestRate || 0) ? loan : max
    );

    return {
      loanCount: cleanLoans.length,
      totalDebt,
      totalMonthlyEMI: totalEMI,
      averageInterestRate: Number(avgInterest.toFixed(2)),
      highestInterestLoan,
      loans: cleanLoans,
    };
  }, [loans]);

  useCopilotReadable({
    description:
      "Authenticated user's structured loan portfolio including total debt, EMI burden, average interest, and individual loan details.",
    value: structuredData,
  });

  return null;
}

export default function LoanGuideLayout({ children }) {
  const [open, setOpen] = React.useState(true);
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    async function fetchLoans() {
      try {
        const res = await fetch("/api/loans", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setLoans(data);
        }
      } catch (err) {
        console.error("Error fetching loans:", err);
      }
    }

    fetchLoans();
  }, []);

  return (
    <CopilotKit publicApiKey="ck_pub_eafff044696b6c71b7d46f200be2efc2">

      {/* Inject loan context */}
      <CopilotLoanContext loans={loans} />

      <div className="flex h-screen pt-16">
        <LoanSideBar open={open} setOpen={setOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Floating AI Popup */}
      <CopilotPopup
        labels={{
          title: "Credify AI",
          initial:
            "Hi Ved 👋 I’ve analyzed your loans. Want help prioritizing repayment?",
        }}
        suggestions={[
          { label: "Which loan should I close first?" },
          { label: "How can I reduce my EMI burden?" },
          { label: "Should I use snowball or avalanche?" },
          { label: "Am I over-leveraged?" },
        ]}
        instructions="
          You are Credify AI, a professional loan advisor.
          Use the provided structured numeric loan data.
          Give personalized, number-based recommendations.
          Always reference total debt, EMI, and interest rates.
        "
      />
    </CopilotKit>
  );
}