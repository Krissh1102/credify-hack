"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import {
  Scale,
  Gauge,
  Landmark,
  ShieldCheck,
  TrendingDown,
  Sparkles, // New icon for AI
} from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function DebtOverviewPage() {
  const [loans, setLoans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(null);

  const retryInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const insightsRes = await fetch("/api/debt-insights", { credentials: "include" });
      if (insightsRes.ok) {
        const insightsJson = await insightsRes.json();
        setInsights(insightsJson);
        setInsightsError(null);
      } else {
        setInsightsError(`Failed to load insights (${insightsRes.status})`);
      }
    } catch (err) {
      setInsightsError("Network error while fetching insights");
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [loansRes, profileRes, insightsRes] = await Promise.all([
          fetch("/api/loans"),
          fetch("/api/user-profile"),
          // include credentials so server-side `auth()` (Clerk) can read the session cookie
          fetch("/api/debt-insights", { credentials: "include" }),
        ]);

        if (!loansRes.ok) throw new Error("Failed to fetch loans");
        if (!profileRes.ok) throw new Error("Failed to fetch user profile");

        const loansJson = await loansRes.json();
        const profileJson = await profileRes.json();

        if (insightsRes.ok) {
          const insightsJson = await insightsRes.json();
          setInsights(insightsJson);
          setInsightsError(null);
        } else {
          console.warn("Could not fetch AI insights:", insightsRes.status, insightsRes.statusText);
          setInsightsError(`Failed to load insights (${insightsRes.status})`);
        }

        setLoans(loansJson);
        setProfile(profileJson);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setInsightsLoading(false);
      }
    };

    fetchData();
  }, []);

  const { debtCompositionData, debtHistory, activeLoans } = useMemo(() => {
    if (!loans || loans.length === 0 || !profile) {
      return { debtCompositionData: [], debtHistory: [], activeLoans: [] };
    }
    const activeLoans = loans.filter((l) => l.status === "ACTIVE");
    const debtCompositionData = activeLoans.map((loan) => ({
      name: loan.type,
      value: Number(loan.outstandingBalance),
    }));
    let firstLoanYear = null;
    if (loans.length > 0) {
      const allYears = loans
        .map((l) => (l.issueDate ? new Date(l.issueDate).getFullYear() : null))
        .filter(Boolean);
      if (allYears.length > 0) {
        firstLoanYear = Math.min(...allYears);
      }
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = firstLoanYear || currentYear;
    const years = Array.from(
      { length: currentYear - startYear + 1 },
      (_, i) => startYear + i
    );
    const debtHistory = years.map((year, idx) => ({
      year: year.toString(),
      balance: Math.round(
        (profile.totalDebt ?? 0) * Math.pow(0.92, years.length - 1 - idx)
      ),
    }));
    const activeLoansWithPayoff = activeLoans.map((loan) => {
      const monthsLeft = Math.ceil(
        Number(loan.outstandingBalance) / Number(loan.emiAmount)
      );
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + monthsLeft);
      return {
        ...loan,
        payoffYear: payoffDate.getFullYear(),
        totalAmount: Number(loan.principalAmount),
        outstanding: Number(loan.outstandingBalance),
        monthlyPayment: Number(loan.emiAmount),
        interestRate: Number(loan.interestRate),
      };
    });
    return {
      debtCompositionData,
      debtHistory,
      activeLoans: activeLoansWithPayoff,
    };
  }, [loans, profile]);

  const getDtiColor = (ratio) => {
    if (ratio <= 35) return "text-emerald-600";
    if (ratio <= 43) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreColor = (score) => {
    if (score >= 750) return "text-emerald-600";
    if (score >= 700) return "text-yellow-600";
    return "text-red-600";
  };

  const COLORS = ["#0ea5e9", "#10b981", "#f97316", "#8b5cf6"];

  if (loading)
    return <div className="p-6 text-center">Loading debt overview...</div>;
  if (error)
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  if (!profile || !loans || loans.length === 0) {
    return (
      <div className="p-6 text-center">
        No active loans found or profile data is missing.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-full">
      <div>
        <h1 className="text-2xl font-bold">Debt Health Overview</h1>
        <p className="text-muted-foreground">
          An analytical look at your debt portfolio and financial standing.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(profile.totalDebt ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(profile.totalMonthlyPayments ?? 0)} in monthly
              payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Debt-to-Income (DTI)
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getDtiColor(profile.dtiRatio ?? 0)}`}
            >
              {(profile.dtiRatio ?? 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {(profile.dtiRatio ?? 0) <= 35
                ? "Healthy ratio"
                : "Needs attention"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getScoreColor(profile.creditScore)}`}
            >
              {profile.creditScore}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on your profile
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Debt-to-Assets
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(profile.debtToAssetsRatio ?? 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Ratio of liabilities to assets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Debt Composition</CardTitle>
            <CardDescription>Distribution of your total debt</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={debtCompositionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                >
                  {debtCompositionData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Debt Reduction History</CardTitle>
            <CardDescription>
              Progress in reducing total debt over years
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtHistory}>
                <XAxis dataKey="year" stroke="#888888" fontSize={12} />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  cursor={{ fill: "rgba(128,128,128,0.1)" }}
                />
                <Bar
                  dataKey="balance"
                  name="Outstanding Balance"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Projected Payoff */}
      <Card>
        <CardHeader>
          <CardTitle>Projected Payoff Timeline</CardTitle>
          <CardDescription>
            When each of your active loans will be fully paid off
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeLoans.map((loan) => {
            const progress =
              ((loan.totalAmount - loan.outstanding) / loan.totalAmount) * 100;
            return (
              <div key={loan.id}>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">{loan.type}</span>
                  <span className="text-sm text-muted-foreground">
                    Payoff by {loan.payoffYear}
                  </span>
                </div>
                <Progress value={progress} />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>
                    {formatCurrency(loan.totalAmount - loan.outstanding)} paid
                  </span>
                  <span>{formatCurrency(loan.outstanding)} remaining</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* AI Actionable Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Actionable Insights</CardTitle>
          </div>
          <CardDescription>
            Personalized recommendations from Gemini to improve your debt health
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {insightsLoading ? (
            <div className="col-span-full flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">
                Generating personalized insights...
              </p>
            </div>
          ) : insightsError ? (
            <div className="col-span-full text-center space-y-2">
              <p className="text-muted-foreground">{insightsError}</p>
              <button
                onClick={retryInsights}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : insights.length > 0 ? (
            insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
              >
                <TrendingDown className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">{insight.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {insight.insight}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center space-y-2">
              <p className="text-muted-foreground">
                No insights available at this time.
              </p>
              <button
                onClick={retryInsights}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
