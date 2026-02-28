"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sparkles,
    TrendingUp,
    Wallet,
    Calculator,
    ShieldCheck,
    Building,
    AlertCircle,
    Lightbulb,
    ChevronRight,
    Loader2,
    RefreshCcw,
    Edit2,
    Check,
} from "lucide-react";
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
    CartesianGrid,
} from "recharts";

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value || 0);

// Simple Indian Tax Calculator (FY 24-25)
const calculateOldRegime = (income, deductions80C) => {
    let taxable = income - 50000; // Standard Deduction
    taxable = Math.max(0, taxable - Math.min(deductions80C, 150000)); // Max 80C is 1.5L
    if (taxable <= 500000) return 0; // Rebate 87A
    let tax = 0;
    if (taxable > 250000) tax += (Math.min(taxable, 500000) - 250000) * 0.05;
    if (taxable > 500000) tax += (Math.min(taxable, 1000000) - 500000) * 0.20;
    if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
    return tax * 1.04; // Cess
};

const calculateNewRegime = (income) => {
    let taxable = Math.max(0, income - 75000); // Standard Deduction in New Regime FY24-25
    if (taxable <= 700000) return 0; // Rebate under 87A
    let tax = 0;
    if (taxable > 300000) tax += (Math.min(taxable, 700000) - 300000) * 0.05;
    if (taxable > 700000) tax += (Math.min(taxable, 1000000) - 700000) * 0.10;
    if (taxable > 1000000) tax += (Math.min(taxable, 1200000) - 1000000) * 0.15;
    if (taxable > 1200000) tax += (Math.min(taxable, 1500000) - 1200000) * 0.20;
    if (taxable > 1500000) tax += (taxable - 1500000) * 0.30;
    return tax * 1.04; // Cess
};

export default function TaxPlanningDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // Dynamic user editable state
    const [userIncome, setUserIncome] = useState(0);
    const [isEditingIncome, setIsEditingIncome] = useState(false);
    const [tempIncomeStr, setTempIncomeStr] = useState("");

    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);

    useEffect(() => {
        fetchTaxData();
    }, []);

    const fetchTaxData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/tax-data");
            if (!res.ok) throw new Error("Failed to fetch tax data");
            const d = await res.json();
            setData(d);
            setUserIncome(d.realIncome || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Dynamically calculate taxes based on the editable userIncome
    const dynamicTaxes = useMemo(() => {
        if (!data) return null;
        const current80c = data.deductions.section80C.total || 0;
        const oldTax = calculateOldRegime(userIncome, current80c);
        const newTax = calculateNewRegime(userIncome);
        return {
            oldRegime: oldTax,
            newRegime: newTax,
            recommended: oldTax < newTax ? "OLD" : "NEW",
            savings: Math.abs(oldTax - newTax),
        };
    }, [userIncome, data]);

    const handleIncomeSave = () => {
        const val = parseInt(tempIncomeStr.replace(/,/g, ""), 10);
        if (!isNaN(val) && val >= 0) {
            setUserIncome(val);
            // Reset AI insights since income changed
            setAiInsights(null);
        }
        setIsEditingIncome(false);
    };

    const generateInsights = async () => {
        if (!data) return;
        setAiLoading(true);

        // Construct tax payload from dynamic state
        const current80c = data.deductions.section80C.total || 0;
        const aiPayload = {
            realIncome: userIncome,
            deductions: data.deductions,
            taxes: dynamicTaxes,
        };

        try {
            const res = await fetch("/api/tax-data/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taxData: aiPayload }),
            });
            if (!res.ok) throw new Error("AI generation failed");
            const insights = await res.json();
            setAiInsights(insights);
        } catch (err) {
            console.error(err);
            setAiInsights([{ title: "Copilot Error", insight: "Failed to generate insights at this time." }]);
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10 space-y-6 animate-pulse">
                <div className="h-40 bg-slate-100 rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-slate-100 rounded-2xl" />
                    <div className="h-64 bg-slate-100 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Unable to load Tax Profile</h2>
                <p className="text-slate-500 mt-2">{error}</p>
                <Button onClick={fetchTaxData} className="mt-6" variant="outline">
                    <RefreshCcw className="w-4 h-4 mr-2" /> Retry
                </Button>
            </div>
        );
    }

    if (!data || !dynamicTaxes) return null;

    const regimeData = [
        { name: "Old Regime", tax: dynamicTaxes.oldRegime, fill: "#3b82f6" },
        { name: "New Regime", tax: dynamicTaxes.newRegime, fill: "#8b5cf6" },
    ];

    const max80c = 150000;
    const current80c = data.deductions.section80C.total;
    const remaining80c = Math.max(max80c - current80c, 0);
    const progress80c = Math.min((current80c / max80c) * 100, 100);

    const breakdownData = [
        { name: "PPF", value: data.deductions.section80C.breakdown.ppf, color: "#10b981" },
        { name: "Fixed Deposits", value: data.deductions.section80C.breakdown.fd, color: "#f59e0b" },
        { name: "Mutual Funds (ELSS)", value: data.deductions.section80C.breakdown.mf, color: "#6366f1" },
        { name: "Remaining Gap", value: remaining80c, color: "#e2e8f0" },
    ];

    const recommendedRegime = dynamicTaxes.recommended === "OLD" ? "Old Tax Regime" : "New Tax Regime";
    const taxSavings = dynamicTaxes.savings;

    return (
        <div className="min-h-screen pb-20">
            <div className="px-4 md:px-8 space-y-8">

                {/* Dynamic Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8 md:p-12 shadow-2xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none delay-150 transition-all" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/30 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none transition-all" />

                    <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold mb-4 backdrop-blur-sm">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                FY 2024-2025 Planning
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
                                Smart Tax Engine
                            </h1>
                            <p className="text-indigo-200 text-base md:text-lg opacity-90 leading-relaxed">
                                We've auto-detected your income from your transactions to build your real-time tax profile.
                                Tweak your estimated income below to dynamically preview tax strategy changes.
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl w-full xl:w-auto min-w-[320px] shadow-lg shadow-black/20 group">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">Estimated Annual Income</p>
                                {!isEditingIncome && (
                                    <button
                                        onClick={() => {
                                            setTempIncomeStr(userIncome.toString());
                                            setIsEditingIncome(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 transition-colors text-indigo-300 hover:text-white"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {isEditingIncome ? (
                                <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-left-2">
                                    <Input
                                        autoFocus
                                        type="number"
                                        value={tempIncomeStr}
                                        onChange={(e) => setTempIncomeStr(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleIncomeSave()}
                                        className="bg-white/20 border-white/30 text-white text-2xl font-bold h-12 focus-visible:ring-indigo-400"
                                    />
                                    <Button onClick={handleIncomeSave} size="icon" className="h-12 w-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md cursor-pointer">
                                        <Check className="w-5 h-5" />
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
                                    {formatCurrency(userIncome)}
                                </p>
                            )}

                            <div className="h-px w-full bg-white/10 mb-4" />

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-indigo-200 font-medium">80C Deductions Found:</span>
                                <span className="font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">{formatCurrency(current80c)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Tax Copilot Feature */}
                <Card className="border-0 shadow-xl overflow-hidden relative group bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <CardHeader className="pb-4 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/20">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-700">
                                        Tax Optimization Copilot
                                    </CardTitle>
                                    <CardDescription className="text-slate-500 font-medium mt-1">
                                        Powered by Gemini AI to find non-obvious tax loopholes for your explicit income.
                                    </CardDescription>
                                </div>
                            </div>

                            {!aiInsights && (
                                <Button
                                    onClick={generateInsights}
                                    disabled={aiLoading}
                                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-6 shadow-xl transition-all hover:scale-105 active:scale-95 w-full md:w-auto"
                                >
                                    {aiLoading ? (
                                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Profile...</>
                                    ) : (
                                        <><Sparkles className="mr-2 h-5 w-5 text-purple-400" /> Generate Strategies</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        {aiInsights ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {aiInsights.map((insight, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-50/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0 group-hover/card:scale-110 transition-transform duration-500" />
                                        <h3 className="font-bold text-lg text-slate-800 mb-3 relative z-10">
                                            {insight.title}
                                        </h3>
                                        <p className="text-slate-600 text-sm leading-relaxed relative z-10">
                                            {insight.insight}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-400 mt-4 bg-white/50 border border-dashed border-slate-300 rounded-3xl transition-colors hover:bg-white/80 hover:border-slate-400 cursor-pointer" onClick={generateInsights}>
                                <Lightbulb className="w-8 h-8 mb-2 text-slate-300" />
                                <p className="text-sm font-medium">Click "Generate Strategies" to unleash the AI Copilot on ₹{formatCurrency(userIncome)}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Core Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Regime Visualizer */}
                    <Card className="border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col h-full bg-white rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 md:p-8 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                        <Calculator className="w-5 h-5 text-indigo-600" /> Regime Comparison
                                    </CardTitle>
                                    <CardDescription className="mt-2 text-sm text-slate-500 max-w-xs">
                                        Dynamic estimation under Old vs. New Indian tax regimes for ₹{formatCurrency(userIncome)}.
                                    </CardDescription>
                                </div>

                                <div className="text-right bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm transition-all duration-500 animate-in fade-in zoom-in-95">
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-0.5">Recommended</p>
                                    <p className="font-black text-emerald-700">{recommendedRegime}</p>
                                    {taxSavings > 0 ? (
                                        <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center justify-end gap-1">
                                            <TrendingUp className="w-3 h-3" /> saves {formatCurrency(taxSavings)}
                                        </p>
                                    ) : (
                                        <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center justify-end gap-1">
                                            No difference
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 flex-grow">
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={regimeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={60}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontWeight: 600, fontSize: 12 }} dy={10} />
                                        <YAxis hide domain={[0, 'auto']} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                                            formatter={(val) => [formatCurrency(val), "Estimated Tax"]}
                                            labelStyle={{ fontWeight: "bold", color: "#1E293B", paddingBottom: "4px" }}
                                        />
                                        <Bar
                                            dataKey="tax"
                                            radius={[8, 8, 8, 8]}
                                            animationDuration={1000}
                                        >
                                            {regimeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={entry.name === recommendedRegime ? 1 : 0.4} className="transition-all duration-500" />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-6 flex justify-around p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                                <div className="text-center transition-all">
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Old Regime Tax</p>
                                    <p className="text-xl font-black text-blue-600">{formatCurrency(dynamicTaxes.oldRegime)}</p>
                                </div>
                                <div className="w-px bg-slate-200" />
                                <div className="text-center transition-all">
                                    <p className="text-xs font-semibold text-slate-500 mb-1">New Regime Tax</p>
                                    <p className="text-xl font-black text-purple-600">{formatCurrency(dynamicTaxes.newRegime)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 80C Tracker */}
                    <Card className="border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col h-full bg-white rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 md:p-8">
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                <Wallet className="w-5 h-5 text-emerald-600" /> Section 80C Health
                            </CardTitle>
                            <CardDescription className="mt-2 text-sm text-slate-500">
                                Track your ₹1.5L exemption limit. Maximize this to dramatically lower tax under Old Regime.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 flex-grow">

                            <div className="mb-8">
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <span className="text-3xl font-black text-slate-800">{formatCurrency(current80c)}</span>
                                        <span className="text-sm font-semibold text-slate-400 ml-2">/ {formatCurrency(max80c)}</span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                        {progress80c.toFixed(0)}% Filled
                                    </span>
                                </div>
                                {/* Custom animated progress bar */}
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out relative"
                                        style={{ width: `${progress80c}%` }}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30" />
                                    </div>
                                </div>
                                {remaining80c > 0 && (
                                    <p className="text-xs font-medium text-slate-500 mt-3 flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-100 text-amber-800">
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>You can still invest <strong className="font-bold">{formatCurrency(remaining80c)}</strong> to hit your max limit.</span>
                                    </p>
                                )}
                            </div>

                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={breakdownData.filter(d => d.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            animationDuration={1500}
                                        >
                                            {breakdownData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val) => formatCurrency(val)}
                                            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: "600", color: "#475569" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
