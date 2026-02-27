"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Turtle,
  Rabbit,
  PiggyBank,
  CalendarOff,
  IndianRupee,
  WandSparkles,
  Loader2,
} from "lucide-react";

export default function RepaymentPlansPage() {
  const [activeLoansData, setActiveLoansData] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState(5000);

  // State for the AI suggestion feature
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const res = await fetch("/api/loans");
        if (!res.ok) throw new Error("Failed to fetch loans");
        const loans = await res.json();
        const mapped = loans
          .filter((l) => l.status === "ACTIVE")
          .map((l) => ({
            id: l.id,
            name: l.name,
            outstanding: Number(l.outstandingBalance),
            interestRate: Number(l.interestRate),
            emi: Number(l.emiAmount),
            remainingMonths:
              l.emiAmount > 0
                ? Math.ceil(Number(l.outstandingBalance) / Number(l.emiAmount))
                : 0,
          }));
        setActiveLoansData(mapped);
        if (mapped.length > 0) {
          setSelectedLoanId(mapped[0].id);
        }
      } catch (err) {
        console.error("Error fetching loans:", err);
        setActiveLoansData([]);
      }
    };
    fetchLoans();
  }, []);

  const selectedLoan = useMemo(
    () => activeLoansData.find((loan) => loan.id === selectedLoanId),
    [selectedLoanId, activeLoansData]
  );

  const handleGetAiSuggestion = async () => {
    if (!selectedLoan) return;

    setIsAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const res = await fetch("/api/repayment-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedLoan),
      });

      if (!res.ok) throw new Error("Failed to get suggestion from AI");

      const data = await res.json();
      setAiSuggestion(data);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatDateFromMonths = (months) => {
    if (months === undefined || months === null || isNaN(months)) return "N/A";
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);
    return targetDate.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  const calculateAmortization = (loan, extraPayment = 0) => {
    if (!loan) return { schedule: [], payoffMonths: 0, totalInterest: 0 };
    let balance = loan.outstanding;
    const monthlyRate = loan.interestRate / 100 / 12;
    let totalInterestPaid = 0;
    let months = 0;
    const schedule = [{ month: 0, balance: balance }];
    
    // Safety break: prevent infinite loops
    const maxMonths = (loan.remainingMonths || 360) * 2;

    while (balance > 0) {
      months++;
      const interestPayment = balance * monthlyRate;
      totalInterestPaid += interestPayment;
      const principalPayment = loan.emi + extraPayment - interestPayment;
      balance -= principalPayment;

      schedule.push({ month: months, balance: Math.max(0, balance) });
      
      if (months > maxMonths) break;
    }

    return {
      payoffMonths: months,
      totalInterest: totalInterestPaid,
      totalPayment: loan.outstanding + totalInterestPaid,
      schedule,
    };
  };

  const { standardPlan, acceleratedPlan } = useMemo(() => {
    if (!selectedLoan) return { standardPlan: {}, acceleratedPlan: {} };
    const standard = calculateAmortization(selectedLoan, 0);
    const accelerated = calculateAmortization(
      selectedLoan,
      extraMonthlyPayment
    );
    return { standardPlan: standard, acceleratedPlan: accelerated };
  }, [selectedLoan, extraMonthlyPayment]);

  const savings =
    (standardPlan.totalInterest || 0) - (acceleratedPlan.totalInterest || 0);
  const timeSavedMonths =
    (standardPlan.payoffMonths || 0) - (acceleratedPlan.payoffMonths || 0);

  if (activeLoansData.length === 0) {
    return <div className="p-6">Loading loans...</div>;
  }

  // CRASH FIX: This guard prevents the rest of the component from rendering
  // until a loan is fully selected, avoiding errors like "cannot read property 'emi' of undefined".
  if (!selectedLoan) {
    return <div className="p-6">Please select a loan to analyze.</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Repayment Strategies
        </h1>
        <p className="text-muted-foreground">
          See how extra payments can help you become debt-free faster.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategy Builder</CardTitle>
          <CardDescription>
            Select a loan and add an extra monthly payment, or get an AI
            suggestion.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="loan-select" className="text-base">
              Select a Loan to Analyze
            </Label>
            <Select
              value={selectedLoanId}
              onValueChange={setSelectedLoanId}
            >
              <SelectTrigger id="loan-select" className="mt-2 h-12">
                <SelectValue placeholder="Select a loan" />
              </SelectTrigger>
              <SelectContent>
                {activeLoansData.map((loan) => (
                  <SelectItem key={loan.id} value={loan.id}>
                    {loan.name} - {formatCurrency(loan.outstanding)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="extra-payment" className="text-base">
              Extra Monthly Payment
            </Label>
            <div className="mt-2 text-2xl font-bold ">
              {formatCurrency(extraMonthlyPayment)}
            </div>
            <Slider
              value={[extraMonthlyPayment]}
              onValueChange={(val) => setExtraMonthlyPayment(val[0])}
              max={selectedLoan.emi ? selectedLoan.emi * 2 : 10000}
              step={500}
              className="mt-3"
            />
          </div>
          <div className="md:col-span-2 space-y-4">
            <Button
              onClick={handleGetAiSuggestion}
              disabled={isAiLoading}
              className="w-full sm:w-auto"
            >
              {isAiLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 h-4 w-4" />
              )}
              Get AI Suggestion
            </Button>

            {aiSuggestion && (
              <Card className="bg-slate border-blue-200">
                <CardHeader>
                  <CardTitle className="text-center">
                    AI Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className=" italic">
                    "{aiSuggestion.reasoning}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold ">
                      Suggested:{" "}
                      {formatCurrency(aiSuggestion.suggestedExtraPayment)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() =>
                        setExtraMonthlyPayment(
                          aiSuggestion.suggestedExtraPayment
                        )
                      }
                    >
                      Apply this suggestion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {aiError && <p className="text-sm text-red-500">{aiError}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-300">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Turtle className="h-10 w-10 text-slate-500" />
            <div>
              <CardTitle>Standard Plan</CardTitle>
              <CardDescription>Your current schedule.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payoff Date</span>
              <span className="font-semibold">
                {formatDateFromMonths(standardPlan.payoffMonths)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Interest</span>
              <span className="font-semibold">
                {formatCurrency(standardPlan.totalInterest)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Rabbit className="h-10 w-10 text-primary" />
            <div>
              <CardTitle>Accelerated Plan</CardTitle>
              <CardDescription>
                With {formatCurrency(extraMonthlyPayment)} extra per month.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Payoff Date</span>
              <span className="font-semibold text-primary">
                {formatDateFromMonths(acceleratedPlan.payoffMonths)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Total Interest</span>
              <span className="font-semibold text-primary">
                {formatCurrency(acceleratedPlan.totalInterest)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-emerald-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="text-emerald-800">
            Your Potential Savings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-center md:grid-cols-3">
          <div className="space-y-1">
            <PiggyBank className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-800">
              {formatCurrency(savings)}
            </p>
            <p className="text-sm text-emerald-700">Total Interest Saved</p>
          </div>
          <div className="space-y-1">
            <CalendarOff className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-800">
              {Math.floor(timeSavedMonths / 12)}y {timeSavedMonths % 12}m
            </p>
            <p className="text-sm text-emerald-700">Time Saved</p>
          </div>
          <div className="space-y-1">
            <IndianRupee className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-800">
              {/* SAFETY FIX: Use optional chaining and a fallback value */}
              {formatCurrency((selectedLoan?.emi || 0) + extraMonthlyPayment)}
            </p>
            <p className="text-sm text-emerald-700">New Monthly Payment</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance Reduction Chart</CardTitle>
          <CardDescription>
            Visual comparison of your loan balance decrease over time.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="month"
                name="Months"
                unit="m"
                type="number"
                domain={[0, "dataMax"]}
              />
              <YAxis
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                data={standardPlan.schedule}
                name="Standard Plan"
                stroke="#71717a"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="balance"
                data={acceleratedPlan.schedule}
                name="Accelerated Plan"
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}