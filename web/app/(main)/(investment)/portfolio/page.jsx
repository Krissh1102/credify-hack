// ./components/DetailedPortfolioPage.jsx

"use client";

import { useMemo, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Lightbulb,
  ShieldAlert,
  CheckCircle2,
  WandSparkles,
  Loader2,
  Sparkles,
  History,
  TrendingUp,
  Calendar,
  Wallet,
  Zap,
  Info,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

export default function DetailedPortfolioPage() {
  const [investments, setInvestments] = useState([]);
  const [fixedIncome, setFixedIncome] = useState({ fds: [], ppf: { balance: 0, asOf: "" }, bonds: [] });
  const [otherAssets, setOtherAssets] = useState({ realEstate: [], gold: [] });
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);
  const [error, setError] = useState(null);

  const [analysis, setAnalysis] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [invRes, assetsRes] = await Promise.all([
          fetch("/api/investments"),
          fetch("/api/portfolio-assets"),
        ]);
        if (!invRes.ok) throw new Error("Failed to fetch investments");
        if (!assetsRes.ok) throw new Error("Failed to fetch portfolio assets");
        const invData = await invRes.json();
        const assetsData = await assetsRes.json();

        setInvestments(invData);
        setFixedIncome({
          fds: assetsData.fds || [],
          ppf: assetsData.ppfs && assetsData.ppfs[0] ? { balance: Number(assetsData.ppfs[0].balance), asOf: assetsData.ppfs[0].asOf || new Date() } : { balance: 0, asOf: new Date() },
          bonds: assetsData.bonds || [],
        });
        setOtherAssets({
          realEstate: assetsData.realEstates || [],
          gold: assetsData.golds || [],
        });

        // Fetch live market data for consistency with overview page
        if (invData.length > 0) {
          setMarketLoading(true);
          const mDataRes = await fetch("/api/market-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ investments: invData }),
          });
          if (mDataRes.ok) {
            const mData = await mDataRes.json();
            setMarketData(mData);
          }
          setMarketLoading(false);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  // Calculate derived lists using market data if available
  const enrichedInvestments = useMemo(() => {
    if (!marketData) return investments.map(inv => ({ ...inv, investedAmount: Number(inv.amount), currentValue: Number(inv.currentValue) || Number(inv.amount), changePercent: 0 }));
    return marketData.investments;
  }, [investments, marketData]);

  const equity = enrichedInvestments.filter((inv) => inv.type === "STOCKS").map((inv) => ({
    id: inv.id,
    symbol: inv.name,
    qty: inv.quantity || 1,
    avg: inv.investedAmount / (inv.quantity || 1),
    cmp: inv.currentValue / (inv.quantity || 1),
    dayChange: inv.changePercent,
    transactions: [{ type: "Buy", date: new Date(inv.date).toLocaleDateString("en-IN"), qty: 1, price: inv.investedAmount }]
  }));

  const mutualFunds = enrichedInvestments.filter((inv) => inv.type === "MUTUAL_FUNDS").map((inv) => ({
    id: inv.id,
    name: inv.name,
    invested: inv.investedAmount,
    currentValue: inv.currentValue,
    xirr: 0,
    transactions: [{ type: "SIP", date: new Date(inv.date).toLocaleDateString("en-IN"), amount: inv.investedAmount }]
  }));

  const portfolioSummary = useMemo(() => {
    // 1. Equity & MF (from Investments table)
    const equityData = equity.reduce((acc, stock) => {
      const { invested, currentValue } = calculatePL(stock.avg, stock.cmp, stock.qty);
      acc.invested += invested;
      acc.current += currentValue;
      return acc;
    }, { invested: 0, current: 0 });

    const mfData = mutualFunds.reduce((acc, fund) => {
      acc.invested += fund.invested;
      acc.current += fund.currentValue;
      return acc;
    }, { invested: 0, current: 0 });

    // 2. Fixed Income (Merge Specific Tables + Generic Investments)
    const genericBonds = enrichedInvestments.filter(i => i.type === "BONDS");
    const genericFDs = enrichedInvestments.filter(i => i.type === "FIXED_DEPOSIT");
    const genericPPFs = enrichedInvestments.filter(i => i.type === "PPF");

    const fiInvested = fixedIncome.fds.reduce((s, fd) => s + Number(fd.principal), 0) +
      Number(fixedIncome.ppf.balance) +
      fixedIncome.bonds.reduce((s, b) => s + Number(b.invested || 0), 0) +
      genericBonds.reduce((s, b) => s + b.investedAmount, 0) +
      genericFDs.reduce((s, f) => s + f.investedAmount, 0) +
      genericPPFs.reduce((s, p) => s + p.investedAmount, 0);

    const fiCurrent = fixedIncome.fds.reduce((s, fd) => s + Number(fd.principal), 0) +
      Number(fixedIncome.ppf.balance) +
      fixedIncome.bonds.reduce((s, b) => s + Number(b.currentValue || 0), 0) +
      genericBonds.reduce((s, b) => s + b.currentValue, 0) +
      genericFDs.reduce((s, f) => s + f.currentValue, 0) +
      genericPPFs.reduce((s, p) => s + p.currentValue, 0);

    // 3. Other Assets (Merge Specific Tables + Generic Investments)
    const genericRE = enrichedInvestments.filter(i => i.type === "REAL_ESTATE");
    const genericGold = enrichedInvestments.filter(i => i.type === "GOLD");
    const genericOther = enrichedInvestments.filter(i => i.type === "OTHER" || i.type === "CRYPTO");

    const otherInvested = otherAssets.realEstate.reduce((s, a) => s + Number(a.purchasePrice), 0) +
      otherAssets.gold.reduce((s, a) => s + Number(a.purchasePrice), 0) +
      genericRE.reduce((s, a) => s + a.investedAmount, 0) +
      genericGold.reduce((s, a) => s + a.investedAmount, 0) +
      genericOther.reduce((s, a) => s + a.investedAmount, 0);

    const otherCurrent = otherAssets.realEstate.reduce((s, a) => s + Number(a.currentValue), 0) +
      otherAssets.gold.reduce((s, a) => s + Number(a.currentValue), 0) +
      genericRE.reduce((s, a) => s + a.currentValue, 0) +
      genericGold.reduce((s, a) => s + a.currentValue, 0) +
      genericOther.reduce((s, a) => s + a.currentValue, 0);

    const totalInvested = equityData.invested + mfData.invested + fiInvested + otherInvested;
    const totalCurrentValue = equityData.current + mfData.current + fiCurrent + otherCurrent;
    const overallPnl = totalCurrentValue - totalInvested;
    const overallPnlPercent = totalInvested > 0 ? (overallPnl / totalInvested) * 100 : 0;

    const chartData = [
      { name: "Equity", value: equityData.current, color: COLORS.equity },
      { name: "Mutual Funds", value: mfData.current, color: COLORS.mutualFunds },
      { name: "Fixed Income", value: fiCurrent, color: COLORS.fixedIncome },
      { name: "Other Assets", value: otherCurrent, color: COLORS.otherAssets },
    ].filter(item => item.value > 0);

    const allocations = totalCurrentValue > 0 ? {
      equity: (equityData.current / totalCurrentValue) * 100,
      mutualFunds: (mfData.current / totalCurrentValue) * 100,
      fixedIncome: (fiCurrent / totalCurrentValue) * 100,
      otherAssets: (otherCurrent / totalCurrentValue) * 100,
    } : { equity: 0, mutualFunds: 0, fixedIncome: 0, otherAssets: 0 };

    return { totalInvested, totalCurrentValue, overallPnl, overallPnlPercent, chartData, allocations };
  }, [equity, mutualFunds, fixedIncome, otherAssets]);

  const handleGetAnalysis = async () => {
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/portfolio-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioSummary }),
      });
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || "Failed to generate analysis");
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  if (loading) return (
    <div className="p-4 md:p-8 min-h-screen space-y-6 animate-pulse">
      <div className="h-28 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-100" />
    </div>
  );
  if (error) return (
    <div className="p-8 flex flex-col items-center text-center">
      <div className="text-red-500 font-semibold text-lg mb-1">Failed to load portfolio</div>
      <div className="text-slate-400 text-sm">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Hero banner */}

      <div className="px-4 md:px-8">

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="mutual-funds">Mutual Funds</TabsTrigger>
            <TabsTrigger value="fixed-income">Fixed Income</TabsTrigger>
            <TabsTrigger value="other-assets">Other Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <PortfolioDashboard summary={portfolioSummary} />
          </TabsContent>
          <TabsContent value="equity" className="mt-6">
            <EquityHoldings data={equity} />
          </TabsContent>
          <TabsContent value="mutual-funds" className="mt-6">
            <MutualFundsHoldings data={mutualFunds} />
          </TabsContent>
          <TabsContent value="fixed-income" className="mt-6">
            <FixedIncomeHoldings data={fixedIncome} genericInvestments={enrichedInvestments} />
          </TabsContent>
          <TabsContent value="other-assets" className="mt-6">
            <OtherAssetsHoldings data={otherAssets} genericInvestments={enrichedInvestments} />
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <PortfolioAnalysis
            analysis={analysis}
            isLoading={isAnalysisLoading}
            error={analysisError}
            onAnalyze={handleGetAnalysis}
            summary={portfolioSummary}
          />
        </div>

        <div className="mt-8 pb-10">
          <FutureWealthPredictor summary={portfolioSummary} />
        </div>
      </div>
    </div>
  );
}

// --- HELPER FUNCTIONS ---
const formatCurrency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value || 0);
const calculatePL = (avgPrice, currentPrice, quantity) => { const invested = avgPrice * quantity; const currentValue = currentPrice * quantity; const pnl = currentValue - invested; const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0; return { invested, currentValue, pnl, pnlPercent }; };
const COLORS = { equity: "#22c55e", mutualFunds: "#3b82f6", fixedIncome: "#8b5cf6", otherAssets: "#f97316" };

// --- SUB-COMPONENTS ---
const PortfolioDashboard = ({ summary }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500 font-medium">Total Invested</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold text-slate-800">
          {formatCurrency(summary.totalInvested)}
        </CardContent>
      </Card>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500 font-medium">Current Total Value</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold text-blue-600">
          {formatCurrency(summary.totalCurrentValue)}
        </CardContent>
      </Card>
      <Card className="md:col-span-2 border-0 shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl flex items-center justify-center">
          <TrendingUp className="w-12 h-12 text-emerald-500/10" />
        </div>
        <CardHeader>
          <CardTitle className="text-sm text-slate-500 font-medium">Overall Net Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className={`text-4xl font-extrabold tracking-tight ${summary.overallPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(summary.overallPnl)}
              </div>
              <div className={`flex items-center gap-1.5 text-sm font-bold mt-1 ${summary.overallPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {summary.overallPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(summary.overallPnlPercent).toFixed(2)}% net returns
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card className="border-0 shadow-md flex flex-col h-full bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-700">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={summary.chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
            >
              {summary.chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>
);

const FutureWealthPredictor = ({ summary }) => {
  const [years, setYears] = useState(10);

  // Constants - Standard yields for various asset classes
  const yields = { equity: 0.15, mutualFunds: 0.12, fixedIncome: 0.07, otherAssets: 0.08 };

  const weightedYield = useMemo(() => {
    if (!summary || summary.totalCurrentValue === 0) return 0.12;
    const alloc = summary.allocations || { equity: 30, mutualFunds: 30, fixedIncome: 20, otherAssets: 20 };
    return (alloc.equity / 100) * yields.equity + (alloc.mutualFunds / 100) * yields.mutualFunds + (alloc.fixedIncome / 100) * yields.fixedIncome + (alloc.otherAssets / 100) * yields.otherAssets;
  }, [summary]);

  const projectionData = useMemo(() => {
    const data = [];
    let capital = summary.totalCurrentValue;

    for (let i = 0; i <= years; i++) {
      const projectedVal = summary.totalCurrentValue * Math.pow(1 + weightedYield, i);
      data.push({
        year: i === 0 ? "Now" : `Y${i}`,
        fullYear: 2024 + i,
        Predicted: Math.round(projectedVal),
        Static: Math.round(summary.totalCurrentValue),
        isMilestone: projectedVal >= 10000000 // 1 Crore check
      });
    }
    return data;
  }, [summary.totalCurrentValue, weightedYield, years]);

  const finalValue = projectionData[projectionData.length - 1].Predicted;
  const multiplier = (finalValue / summary.totalCurrentValue).toFixed(1);

  return (
    <Card className="border shadow-2xl overflow-hidden bg-white text-slate-900 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      <CardHeader className="border-b border-slate-100 relative z-10 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-slate-800">Wealth Projection Engine</CardTitle>
            </div>
            <CardDescription className="text-slate-500 max-w-lg">
              Projecting your current portfolio value over the next few decades based on your asset allocation.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            {[5, 10, 20, 30].map(y => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${years === y ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105" : "text-slate-500 hover:text-slate-800 hover:bg-white"}`}
              >
                {y}Y
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">

          {/* Summary Sidebar */}
          <div className="xl:col-span-3 space-y-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-transparent p-5 rounded-2xl border-l-4 border-blue-500 shadow-sm">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Current Capital</p>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(summary.totalCurrentValue)}</p>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-transparent p-5 rounded-2xl border-l-4 border-indigo-500 shadow-sm">
                <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Value in {years} Years</p>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(finalValue)}</p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="bg-emerald-500 p-2.5 rounded-xl shadow-md shadow-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-tight">Growth Multiplier</p>
                  <p className="text-xl font-black text-slate-800">{multiplier}x <span className="text-xs font-normal text-slate-500 ml-1">Capital growth</span></p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Portfolio Yield</p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black text-slate-800">{(weightedYield * 100).toFixed(1)}%</span>
                <span className="text-xs font-bold text-slate-400 mb-1">p.a.</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Weighted average based on your current Equity, Mutual Funds, and Fixed Income mix.
              </p>
            </div>
          </div>

          {/* Chart Area */}
          <div className="xl:col-span-9 h-[400px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                />
                <YAxis hide domain={['dataMin', 'auto']} />
                <Tooltip
                  cursor={{ stroke: '#2563eb', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const growth = ((data.Predicted / summary.totalCurrentValue - 1) * 100).toFixed(0);
                      return (
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b border-slate-100 pb-2">Year: {label} ({data.fullYear})</p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">Projected Value</p>
                              <p className="text-lg font-bold text-slate-900">{formatCurrency(data.Predicted)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                              <ArrowUp className="w-3 h-3" /> {growth}% Gain
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Predicted"
                  stroke="#2563eb"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorPredicted)"
                  animationDuration={2000}
                />
                <ReferenceLine
                  y={summary.totalCurrentValue}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  label={{ position: 'top', value: 'Today', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                />
                {projectionData.some(d => d.Predicted >= 10000000) && (
                  <ReferenceLine
                    y={10000000}
                    stroke="#eab308"
                    strokeDasharray="3 3"
                    label={{ position: 'right', value: '1 Crore Club', fill: '#eab308', fontSize: 10, fontWeight: '900' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            <div className="absolute top-0 right-4 p-2.5 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full" />
                <span className="text-[10px] font-black text-slate-500 uppercase">Growth Projection</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Health score derived from pnlPercent: 0-100 clamped
const calcHealthScore = (pnlPercent) => Math.min(100, Math.max(0, 50 + pnlPercent * 2));

const PortfolioAnalysis = ({ analysis, isLoading, error, onAnalyze, summary }) => {
  const score = calcHealthScore(summary?.overallPnlPercent || 0);
  const scoreColor = score >= 70 ? "#16a34a" : score >= 40 ? "#f97316" : "#dc2626";
  const scoreLabel = score >= 70 ? "Healthy" : score >= 40 ? "Moderate" : "Needs Attention";
  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="border-b bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">AI Portfolio Analysis</CardTitle>
            <CardDescription className="mt-1">Get AI-powered strengths, risks and actionable suggestions.</CardDescription>
          </div>
          {/* Health score gauge */}
          {summary && (
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3"
                    strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold" style={{ color: scoreColor }}>{Math.round(score)}</span>
                </div>
              </div>
              <span className="text-xs font-semibold mt-1" style={{ color: scoreColor }}>{scoreLabel}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-slate-500">Analyzing your portfolio with AI...</span>
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Button onClick={onAnalyze} variant="outline">Try Again</Button>
          </div>
        ) : analysis ? (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3 p-4 rounded-xl bg-green-50 border border-green-100">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><h3 className="font-semibold text-green-800">Strengths</h3></div>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-green-700">{analysis.strengths.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
            <div className="space-y-3 p-4 rounded-xl bg-orange-50 border border-orange-100">
              <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-orange-600" /><h3 className="font-semibold text-orange-800">Risks</h3></div>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-orange-700">{analysis.risks.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
            <div className="space-y-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-blue-600" /><h3 className="font-semibold text-blue-800">Suggestions</h3></div>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-blue-700">{analysis.suggestions.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          </div>
        ) : (
          <div className="text-center p-10">
            <WandSparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4 text-sm">Click below to get a personalized AI assessment of your portfolio.</p>
            <Button onClick={onAnalyze} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white">
              <WandSparkles className="mr-2 h-4 w-4" />Analyze My Portfolio
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EquityHoldings = ({ data }) => {
  const totals = useMemo(() => data.reduce((acc, stock) => { const { invested, currentValue, pnl } = calculatePL(stock.avg, stock.cmp, stock.qty); acc.invested += invested; acc.currentValue += currentValue; acc.pnl += pnl; acc.dayPnl += (stock.cmp * stock.qty * (stock.dayChange / 100)); return acc; }, { invested: 0, currentValue: 0, pnl: 0, dayPnl: 0 }), [data]);
  return (
    <Card>
      <CardHeader><CardTitle>Equity Holdings</CardTitle><CardDescription>Day's P&L: <span className={`font-bold ${totals.dayPnl >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(totals.dayPnl)}</span></CardDescription></CardHeader>
      <CardContent><Table>
        <TableHeader><TableRow><TableHead>Symbol</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Avg. Price</TableHead><TableHead className="text-right">CMP</TableHead><TableHead className="text-right">Invested</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">P&L (₹)</TableHead><TableHead className="text-right">P&L (%)</TableHead><TableHead className="text-right">Day's Change</TableHead></TableRow></TableHeader>
        <TableBody>{data.map((stock) => {
          const { invested, currentValue, pnl, pnlPercent } = calculatePL(stock.avg, stock.cmp, stock.qty);
          const isEst = stock.marketData?.isEstimated;
          return (<Collapsible asChild key={stock.id}>
            <><TableRow><TableCell><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-start">{stock.symbol} {isEst && <span className="ml-1 text-[10px] text-blue-500 font-bold bg-blue-50 px-1 rounded">EST</span>} <ChevronsUpDown className="ml-2 h-4 w-4" /></Button></CollapsibleTrigger></TableCell><TableCell className="text-right">{stock.qty}</TableCell><TableCell className="text-right">{formatCurrency(stock.avg)}</TableCell><TableCell className="text-right">{formatCurrency(stock.cmp)}</TableCell><TableCell className="text-right">{formatCurrency(invested)}</TableCell><TableCell className="text-right font-bold">{formatCurrency(currentValue)}</TableCell><TableCell className={`text-right ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(pnl)}</TableCell><TableCell className={`text-right font-bold ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>{pnlPercent.toFixed(2)}%</TableCell><TableCell className={`text-right ${stock.dayChange >= 0 ? "text-green-600" : "text-red-600"}`}>{stock.dayChange.toFixed(2)}%</TableCell></TableRow>
              <CollapsibleContent asChild><TableRow><TableCell colSpan={9} className="p-0"><div className="p-4 bg-muted"><h4 className="font-semibold mb-2">Transaction History</h4>{stock.transactions.map((tx, i) => (<p key={i} className="text-sm">{tx.type} {tx.qty} shares @ {formatCurrency(tx.price)} on {tx.date}</p>))}</div></TableCell></TableRow></CollapsibleContent></>
          </Collapsible>);
        })}</TableBody>
        <TableFooter><TableRow className="font-bold bg-secondary"><TableCell colSpan={4}>Totals</TableCell><TableCell className="text-right">{formatCurrency(totals.invested)}</TableCell><TableCell className="text-right">{formatCurrency(totals.currentValue)}</TableCell><TableCell colSpan={3} className={`text-right ${totals.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(totals.pnl)}</TableCell></TableRow></TableFooter>
      </Table></CardContent>
    </Card>
  );
};

const MutualFundsHoldings = ({ data }) => (
  <Card>
    <CardHeader><CardTitle>Mutual Fund Holdings</CardTitle></CardHeader>
    <CardContent><Table>
      <TableHeader><TableRow><TableHead>Fund Name</TableHead><TableHead className="text-right">Invested</TableHead><TableHead className="text-right">Current Value</TableHead><TableHead className="text-right">Gain</TableHead><TableHead className="text-right">XIRR</TableHead></TableRow></TableHeader>
      <TableBody>{data.map((fund) => {
        const gain = fund.currentValue - fund.invested;
        return (<Collapsible asChild key={fund.id}>
          <><TableRow><TableCell><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-start text-left">{fund.name} <ChevronsUpDown className="ml-2 h-4 w-4" /></Button></CollapsibleTrigger></TableCell><TableCell className="text-right">{formatCurrency(fund.invested)}</TableCell><TableCell className="text-right font-bold">{formatCurrency(fund.currentValue)}</TableCell><TableCell className={`text-right ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(gain)}</TableCell><TableCell className={`text-right font-bold ${fund.xirr >= 0 ? "text-green-600" : "text-red-600"}`}>{fund.xirr.toFixed(2)}%</TableCell></TableRow>
            <CollapsibleContent asChild><TableRow><TableCell colSpan={5} className="p-0"><div className="p-4 bg-muted"><h4 className="font-semibold mb-2">Transaction History (Partial)</h4>{fund.transactions.slice(0, 3).map((tx, i) => (<p key={i} className="text-sm">{tx.type} of {formatCurrency(tx.amount)} on {tx.date}</p>))}</div></TableCell></TableRow></CollapsibleContent></>
        </Collapsible>);
      })}</TableBody>
    </Table></CardContent>
  </Card>
);

// CORRECTED: Components now map over arrays and handle multiple assets
const FixedIncomeHoldings = ({ data, genericInvestments }) => {
  const genericBonds = genericInvestments.filter(i => i.type === "BONDS");
  const genericFDs = genericInvestments.filter(i => i.type === "FIXED_DEPOSIT");
  const genericPPFs = genericInvestments.filter(i => i.type === "PPF");
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Fixed Deposits</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.fds.map((fd) => (
            <div key={fd.id} className="mb-2 p-2 border rounded bg-slate-50"><strong>{fd.bank}:</strong> {formatCurrency(Number(fd.principal))} @ {fd.rate}% until {new Date(fd.maturityDate).toLocaleDateString("en-IN")}</div>
          ))}
          {genericFDs.map((fd) => (
            <div key={fd.id} className="mb-2 p-2 border rounded bg-slate-50 border-dashed">
              <strong>{fd.name}:</strong> {formatCurrency(fd.currentValue)}
              <p className="text-[10px] text-slate-400">Added via General Form</p>
            </div>
          ))}
          {data.fds.length === 0 && genericFDs.length === 0 && <p className="text-muted-foreground">No fixed deposits found.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>PPF</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 border rounded-xl bg-blue-50/50">
            <p className="text-sm font-medium text-blue-800">Direct PPF Account</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(data.ppf.balance)}</p>
            <p className="text-[10px] text-slate-400">As of {new Date(data.ppf.asOf).toLocaleDateString("en-IN")}</p>
          </div>
          {genericPPFs.map(p => (
            <div key={p.id} className="p-3 border rounded-xl bg-blue-50/50 border-dashed">
              <p className="text-sm font-medium text-blue-800">{p.name}</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(p.currentValue)}</p>
              <p className="text-[10px] text-slate-400">Added via General Form</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bonds & Debentures</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* Specific Table Bonds */}
          {data.bonds.map((bond) => (
            <div key={bond.id} className="p-2 border rounded-lg bg-slate-50">
              <p className="font-semibold text-sm">{bond.name}</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(Number(bond.currentValue))}</p>
            </div>
          ))}
          {/* Generic Investment Bonds */}
          {genericBonds.map((bond) => (
            <div key={bond.id} className="p-2 border rounded-lg bg-slate-50">
              <p className="font-semibold text-sm">{bond.name}</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(bond.currentValue)}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Invested via General form</p>
            </div>
          ))}
          {data.bonds.length === 0 && genericBonds.length === 0 && <p className="text-muted-foreground">No bonds found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

const OtherAssetsHoldings = ({ data, genericInvestments }) => {
  const genericRE = genericInvestments.filter(i => i.type === "REAL_ESTATE");
  const genericGold = genericInvestments.filter(i => i.type === "GOLD");
  const genericOther = genericInvestments.filter(i => i.type === "OTHER" || i.type === "CRYPTO");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Real Estate</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {data.realEstate.map(asset => (
            <div key={asset.id} className="p-3 border rounded-xl bg-slate-50">
              <p className="font-semibold">{asset.desc}</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(Number(asset.currentValue))}</p>
              <p className="text-xs text-green-600 font-medium">Gain: {formatCurrency(Number(asset.currentValue) - Number(asset.purchasePrice))}</p>
            </div>
          ))}
          {genericRE.map(asset => (
            <div key={asset.id} className="p-3 border rounded-xl bg-slate-50 border-dashed">
              <p className="font-semibold">{asset.name}</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(asset.currentValue)}</p>
              <p className="text-[10px] text-slate-400">Added via General Form</p>
            </div>
          ))}
          {data.realEstate.length === 0 && genericRE.length === 0 && <p className="text-muted-foreground">No real estate assets found.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Gold & Crypto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Gold Table */}
          {data.gold.map(asset => (
            <div key={asset.id} className="p-3 border rounded-xl bg-amber-50/50 border-amber-100">
              <p className="font-semibold text-amber-900">{asset.desc}</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(Number(asset.currentValue))}</p>
            </div>
          ))}
          {/* Generic Gold */}
          {genericGold.map(asset => (
            <div key={asset.id} className="p-3 border rounded-xl bg-amber-50/50 border-amber-100">
              <p className="font-semibold text-amber-900">{asset.name}</p>
              <p className="text-lg font-bold text-amber-700 font-mono flex flex-col">
                {formatCurrency(asset.currentValue)}
                {asset.changeAmount !== 0 && (
                  <span className={`text-[10px] font-sans ${asset.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {asset.changePercent >= 0 ? "+" : ""}{asset.changeAmount.toFixed(2)} today
                  </span>
                )}
              </p>
            </div>
          ))}
          {/* Generic Other/Crypto */}
          {genericOther.map(asset => (
            <div key={asset.id} className="p-3 border rounded-xl bg-purple-50/50 border-purple-100">
              <p className="font-semibold text-purple-900">{asset.name}</p>
              <p className="text-lg font-bold text-purple-700">{formatCurrency(asset.currentValue)}</p>
              <p className="text-[10px] uppercase text-purple-400 tracking-widest">{asset.type}</p>
            </div>
          ))}
          {data.gold.length === 0 && genericGold.length === 0 && genericOther.length === 0 && <p className="text-muted-foreground">No other assets found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}