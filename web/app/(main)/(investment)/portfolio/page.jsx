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
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export default function DetailedPortfolioPage() {
  const [investments, setInvestments] = useState([]);
  const [fixedIncome, setFixedIncome] = useState({ fds: [], ppf: { balance: 0, asOf: "" }, bonds: [] });
  // CORRECTED: State now holds ARRAYS for real estate and gold
  const [otherAssets, setOtherAssets] = useState({ realEstate: [], gold: [] });
  const [loading, setLoading] = useState(true);
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
        // CORRECTED: Set the full arrays, not just the first item
        setOtherAssets({
          realEstate: assetsData.realEstates || [],
          gold: assetsData.golds || [],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  // CORRECTED: This logic now tries to use a 'currentValue' from your DB.
  // For full accuracy, you should add 'quantity' and 'currentValue' fields to your 'Investment' model in schema.prisma.
  const equity = investments.filter((inv) => inv.type === "STOCKS").map((inv) => ({ 
    id: inv.id, 
    symbol: inv.name, 
    qty: inv.quantity || 1, // Uses quantity from DB if it exists, otherwise defaults to 1
    avg: Number(inv.amount), 
    cmp: Number(inv.currentValue) || Number(inv.amount), // Use currentValue from DB if it exists, else fallback to purchase amount
    dayChange: 0, // This requires a live data feed
    transactions: [{ type: "Buy", date: new Date(inv.date).toLocaleDateString("en-IN"), qty: 1, price: Number(inv.amount) }] 
  }));
  
  const mutualFunds = investments.filter((inv) => inv.type === "MUTUAL_FUNDS").map((inv) => ({ 
    id: inv.id, 
    name: inv.name, 
    invested: Number(inv.amount), 
    currentValue: Number(inv.currentValue) || Number(inv.amount), // Use currentValue from DB if it exists
    xirr: 0, 
    transactions: [{ type: "SIP", date: new Date(inv.date).toLocaleDateString("en-IN"), amount: Number(inv.amount) }] 
  }));
  
  const portfolioSummary = useMemo(() => {
    const equityData = equity.reduce((acc, stock) => { const { invested, currentValue } = calculatePL(stock.avg, stock.cmp, stock.qty); acc.invested += invested; acc.current += currentValue; return acc; }, { invested: 0, current: 0 });
    const mfData = mutualFunds.reduce((acc, fund) => { acc.invested += fund.invested; acc.current += fund.currentValue; return acc; }, { invested: 0, current: 0 });
    const fiInvested = fixedIncome.fds.reduce((acc, fd) => acc + Number(fd.principal), 0) + Number(fixedIncome.ppf.balance) + fixedIncome.bonds.reduce((acc, bond) => acc + Number(bond.invested), 0);
    const fiCurrent = fixedIncome.fds.reduce((acc, fd) => acc + Number(fd.principal), 0) + Number(fixedIncome.ppf.balance) + fixedIncome.bonds.reduce((acc, bond) => acc + Number(bond.currentValue), 0);
    
    // CORRECTED: Use .reduce() to sum the values from all assets in the arrays
    const otherInvested = otherAssets.realEstate.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0) + otherAssets.gold.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
    const otherCurrent = otherAssets.realEstate.reduce((sum, asset) => sum + Number(asset.currentValue), 0) + otherAssets.gold.reduce((sum, asset) => sum + Number(asset.currentValue), 0);

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
    } : { equity: 0, mutualFunds: 0, fixedIncome: 0, otherAssets: 0};

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

  if (loading) return <div className="p-8">Loading portfolio...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="md:p-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">My Detailed Portfolio</h1>

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
          <FixedIncomeHoldings data={fixedIncome} />
        </TabsContent>
        <TabsContent value="other-assets" className="mt-6">
          <OtherAssetsHoldings data={otherAssets} />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <PortfolioAnalysis 
          analysis={analysis}
          isLoading={isAnalysisLoading}
          error={analysisError}
          onAnalyze={handleGetAnalysis}
        />
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
            <Card><CardHeader><CardTitle>Total Invested</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(summary.totalInvested)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Current Value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(summary.totalCurrentValue)}</CardContent></Card>
            <Card className="md:col-span-2"><CardHeader><CardTitle>Overall P&L</CardTitle></CardHeader><CardContent className={`text-2xl font-bold ${summary.overallPnl >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(summary.overallPnl)} ({summary.overallPnlPercent.toFixed(2)}%)</CardContent></Card>
        </div>
        <Card>
            <CardHeader><CardTitle>Asset Allocation</CardTitle></CardHeader>
            <CardContent className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{summary.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /><Legend /></PieChart></ResponsiveContainer></CardContent>
        </Card>
    </div>
);

const PortfolioAnalysis = ({ analysis, isLoading, error, onAnalyze }) => (
    <Card>
        <CardHeader><CardTitle>AI Portfolio Analysis</CardTitle><CardDescription>Get an AI-powered analysis of your portfolio's strengths, risks, and actionable suggestions.</CardDescription></CardHeader>
        <CardContent>
            {isLoading ? (<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-4 text-muted-foreground">Analyzing your portfolio...</span></div>) 
            : error ? (<div className="text-center p-8"><p className="text-red-500 mb-4">Error: {error}</p><Button onClick={onAnalyze} variant="outline">Try Again</Button></div>) 
            : analysis ? (
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-3"><div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-green-600" /><h3 className="text-lg font-semibold">Strengths</h3></div><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{analysis.strengths.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                    <div className="space-y-3"><div className="flex items-center gap-3"><ShieldAlert className="h-6 w-6 text-yellow-600" /><h3 className="text-lg font-semibold">Potential Risks</h3></div><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{analysis.risks.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                    <div className="space-y-3"><div className="flex items-center gap-3"><Lightbulb className="h-6 w-6 text-blue-600" /><h3 className="text-lg font-semibold">Suggestions</h3></div><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{analysis.suggestions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                </div>
            ) : (<div className="text-center p-8"><Button onClick={onAnalyze}><WandSparkles className="mr-2 h-4 w-4" />Analyze My Portfolio</Button></div>)}
        </CardContent>
    </Card>
);

const EquityHoldings = ({ data }) => {
    const totals = useMemo(() => data.reduce((acc, stock) => { const { invested, currentValue, pnl } = calculatePL(stock.avg, stock.cmp, stock.qty); acc.invested += invested; acc.currentValue += currentValue; acc.pnl += pnl; acc.dayPnl += stock.cmp * stock.qty * (stock.dayChange / 100); return acc; }, { invested: 0, currentValue: 0, pnl: 0, dayPnl: 0 }), [data]);
    return (
        <Card>
            <CardHeader><CardTitle>Equity Holdings</CardTitle><CardDescription>Day's P&L: <span className={`font-bold ${totals.dayPnl >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(totals.dayPnl)}</span></CardDescription></CardHeader>
            <CardContent><Table>
                <TableHeader><TableRow><TableHead>Symbol</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Avg. Price</TableHead><TableHead className="text-right">CMP</TableHead><TableHead className="text-right">Invested</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">P&L (₹)</TableHead><TableHead className="text-right">P&L (%)</TableHead><TableHead className="text-right">Day's Change</TableHead></TableRow></TableHeader>
                <TableBody>{data.map((stock) => {
                    const { invested, currentValue, pnl, pnlPercent } = calculatePL(stock.avg, stock.cmp, stock.qty);
                    return (<Collapsible asChild key={stock.id}>
                        <><TableRow><TableCell><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-start">{stock.symbol} <ChevronsUpDown className="ml-2 h-4 w-4" /></Button></CollapsibleTrigger></TableCell><TableCell className="text-right">{stock.qty}</TableCell><TableCell className="text-right">{formatCurrency(stock.avg)}</TableCell><TableCell className="text-right">{formatCurrency(stock.cmp)}</TableCell><TableCell className="text-right">{formatCurrency(invested)}</TableCell><TableCell className="text-right font-bold">{formatCurrency(currentValue)}</TableCell><TableCell className={`text-right ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(pnl)}</TableCell><TableCell className={`text-right font-bold ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>{pnlPercent.toFixed(2)}%</TableCell><TableCell className={`text-right ${stock.dayChange >= 0 ? "text-green-600" : "text-red-600"}`}>{stock.dayChange.toFixed(2)}%</TableCell></TableRow>
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
const FixedIncomeHoldings = ({ data }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
            <CardHeader><CardTitle>Fixed Deposits</CardTitle></CardHeader>
            <CardContent>
                {data.fds.length > 0 ? data.fds.map((fd) => (
                    <div key={fd.id} className="mb-2 p-2 border rounded"><strong>{fd.bank}:</strong> {formatCurrency(Number(fd.principal))} @ {fd.rate}% until {new Date(fd.maturityDate).toLocaleDateString("en-IN")}</div>
                )) : <p className="text-muted-foreground">No fixed deposits found.</p>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>PPF</CardTitle></CardHeader>
            <CardContent>
                <p className="text-xl font-bold">{formatCurrency(data.ppf.balance)}</p>
                <p className="text-sm text-muted-foreground">As of {new Date(data.ppf.asOf).toLocaleDateString("en-IN")}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Bonds</CardTitle></CardHeader>
            <CardContent>
                {data.bonds.length > 0 ? data.bonds.map((bond) => (
                    <div key={bond.id}><strong>{bond.name}:</strong> Current value {formatCurrency(Number(bond.currentValue))}</div>
                )) : <p className="text-muted-foreground">No bonds found.</p>}
            </CardContent>
        </Card>
    </div>
);

const OtherAssetsHoldings = ({ data }) => (
    <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader><CardTitle>Real Estate</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {data.realEstate.length > 0 ? data.realEstate.map(asset => (
                    <div key={asset.id} className="p-2 border rounded">
                        <p className="font-semibold">{asset.desc}</p>
                        <p>Current Value: <span className="font-bold">{formatCurrency(Number(asset.currentValue))}</span></p>
                        <p className="text-sm text-green-600">Appreciation: {formatCurrency(Number(asset.currentValue) - Number(asset.purchasePrice))}</p>
                    </div>
                )) : <p className="text-muted-foreground">No real estate assets found.</p>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Physical Gold</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {data.gold.length > 0 ? data.gold.map(asset => (
                    <div key={asset.id} className="p-2 border rounded">
                        <p className="font-semibold">{asset.desc}</p>
                        <p>Current Value: <span className="font-bold">{formatCurrency(Number(asset.currentValue))}</span></p>
                        <p className="text-sm text-green-600">Appreciation: {formatCurrency(Number(asset.currentValue) - Number(asset.purchasePrice))}</p>
                    </div>
                )) : <p className="text-muted-foreground">No gold assets found.</p>}
            </CardContent>
        </Card>
    </div>
);