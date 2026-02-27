"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DollarSign,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Bell,
  PlusCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

// ── Animated count-up ────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

// ── Currency formatter ───────────────────────────────────────────────────────
const formatINR = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v ?? 0);

const formatINR2 = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v ?? 0);

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="animate-pulse border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-3 bg-slate-200 rounded w-28" />
        <div className="h-4 w-4 bg-slate-200 rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-7 bg-slate-200 rounded w-36 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-24" />
      </CardContent>
    </Card>
  );
}

// ── Animated stat card ───────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, iconClass, valueClass }) {
  const animated = useCountUp(Math.round(value));
  return (
    <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <div className={`p-1.5 rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass || ""}`}>{formatINR(animated)}</div>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ── Donut center label ───────────────────────────────────────────────────────
function DonutCenterLabel({ viewBox, total }) {
  const { cx, cy } = viewBox;
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1,
  }).format(total);
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 12 }}>Total</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#1e293b" style={{ fontSize: 18, fontWeight: 700 }}>{formatted}</text>
    </g>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center mb-6">
        <TrendingUp className="w-12 h-12 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">No investments yet</h2>
      <p className="text-slate-500 max-w-sm mb-8">
        Start building your wealth portfolio by adding your first investment. Track stocks, mutual funds, bonds and more.
      </p>
      <Link
        href="/investment-form"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-emerald-200"
      >
        <PlusCircle className="h-5 w-5" />
        Add Your First Investment
      </Link>
    </div>
  );
}

// ── Live investment row ───────────────────────────────────────────────────────
const TYPE_STYLES = {
  STOCKS: { bg: "bg-green-50 border-green-100", badge: "bg-green-100 text-green-700", emoji: "📈" },
  MUTUAL_FUNDS: { bg: "bg-blue-50 border-blue-100", badge: "bg-blue-100 text-blue-700", emoji: "🔄" },
  BONDS: { bg: "bg-orange-50 border-orange-100", badge: "bg-orange-100 text-orange-700", emoji: "🏛️" },
  REAL_ESTATE: { bg: "bg-yellow-50 border-yellow-100", badge: "bg-yellow-100 text-yellow-700", emoji: "🏠" },
  CRYPTO: { bg: "bg-purple-50 border-purple-100", badge: "bg-purple-100 text-purple-700", emoji: "₿" },
  GOLD: { bg: "bg-amber-50 border-amber-100", badge: "bg-amber-100 text-amber-700", emoji: "🥇" },
  OTHER: { bg: "bg-slate-50 border-slate-100", badge: "bg-slate-100 text-slate-600", emoji: "💼" },
};

function InvestmentRow({ inv }) {
  const style = TYPE_STYLES[inv.type] || TYPE_STYLES.OTHER;
  const isPositive = inv.changePercent >= 0;
  const hasLiveData = inv.marketData && !inv.marketData.isEstimated;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${style.bg} transition-all hover:shadow-sm`}>
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-xl shrink-0">
        {style.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800 text-sm">{inv.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
            {inv.type.replace("_", " ")}
          </span>
          {hasLiveData && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" /> LIVE
            </span>
          )}
        </div>

        {/* Type-specific market data */}
        {inv.type === "STOCKS" && inv.marketData?.livePrice && (
          <p className="text-xs text-slate-500 mt-0.5">
            NSE/BSE: <span className="font-semibold text-slate-700">₹{inv.marketData.livePrice.toLocaleString("en-IN")}</span>
            {" · "}{inv.marketData.symbol}
          </p>
        )}
        {inv.type === "MUTUAL_FUNDS" && inv.marketData?.nav && (
          <p className="text-xs text-slate-500 mt-0.5">
            NAV: <span className="font-semibold text-slate-700">₹{inv.marketData.nav.toFixed(4)}</span>
            {inv.marketData.navDate && ` · as of ${inv.marketData.navDate}`}
          </p>
        )}
        {inv.type === "GOLD" && inv.marketData?.pricePerGram && (
          <p className="text-xs text-slate-500 mt-0.5">
            Gold today: <span className="font-semibold text-amber-700">₹{inv.marketData.pricePerGram.toLocaleString("en-IN")}/g</span>
            {" · "}₹{inv.marketData.pricePerOz?.toLocaleString("en-IN")}/oz
          </p>
        )}
        {inv.type === "CRYPTO" && inv.marketData?.livePrice && (
          <p className="text-xs text-slate-500 mt-0.5">
            Price: <span className="font-semibold text-purple-700">${inv.marketData.livePrice.toLocaleString("en-US")}</span>
            {" · "}{inv.marketData.symbol}
          </p>
        )}

        {inv.marketData?.isEstimated && (
          <p className="text-[10px] text-blue-500/80 font-medium italic mt-0.5 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
            Estimated Valuation ({inv.marketData.annualRateEstimate} avg growth)
          </p>
        )}

        <p className="text-xs text-slate-400 mt-1">
          Invested: <span className="font-medium text-slate-600">{formatINR2(inv.investedAmount)}</span>
          {" · "}{new Date(inv.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      {/* Day change badge */}
      {hasLiveData && inv.changePercent !== 0 && (
        <div className={`shrink-0 flex flex-col items-end`}>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold ${isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(inv.changePercent).toFixed(2)}%
          </div>
          <p className={`text-xs mt-0.5 font-medium ${isPositive ? "text-green-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{formatINR(Math.round(inv.changeAmount))}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const [investments, setInvestments] = useState([]);
  const [fixedIncome, setFixedIncome] = useState({ fds: [], ppf: { balance: 0 }, bonds: [] });
  const [otherAssets, setOtherAssets] = useState({ realEstate: [], gold: [] });
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Fetch raw investments and other assets
  const fetchInvestments = useCallback(async () => {
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
        ppf: assetsData.ppfs && assetsData.ppfs[0] ? { balance: Number(assetsData.ppfs[0].balance) } : { balance: 0 },
        bonds: assetsData.bonds || [],
      });
      setOtherAssets({
        realEstate: assetsData.realEstates || [],
        gold: assetsData.golds || [],
      });

      return invData;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch live market data
  const fetchMarketData = useCallback(async (invList) => {
    if (!invList?.length) return;
    setMarketLoading(true);
    try {
      const res = await fetch("/api/market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investments: invList }),
      });
      if (!res.ok) throw new Error("market data failed");
      const data = await res.json();
      setMarketData(data);
      setLastUpdated(new Date());
    } catch {
      setMarketData(null);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const invList = await fetchInvestments();
    await fetchMarketData(invList);
  }, [fetchInvestments, fetchMarketData]);

  useEffect(() => {
    (async () => {
      const invList = await fetchInvestments();
      await fetchMarketData(invList);
    })();
  }, []);

  // Use enriched data if available, else database cache
  const enriched = marketData?.investments ?? investments.map((inv) => ({
    id: inv.id,
    name: inv.name,
    type: inv.type,
    investedAmount: Number(inv.amount),
    date: inv.date,
    notes: inv.notes,
    currentValue: Number(inv.currentValue) || Number(inv.amount),
    changePercent: 0,
    changeAmount: 0,
    marketData: null,
  }));

  // Summary stats fallback
  const invSummary = marketData?.summary ?? {
    totalInvested: investments.reduce((s, i) => s + Number(i.amount), 0),
    totalCurrentValue: investments.reduce((s, i) => s + (Number(i.currentValue) || Number(i.amount)), 0),
    totalChangeTodayAmount: 0,
    totalChangeTodayPercent: 0,
  };

  // Add fixed assets to the totals
  const fiInvested = fixedIncome.fds.reduce((s, fd) => s + Number(fd.principal), 0) +
    Number(fixedIncome.ppf.balance) +
    fixedIncome.bonds.reduce((s, b) => s + Number(b.invested), 0);

  const otherInvested = otherAssets.realEstate.reduce((s, a) => s + Number(a.purchasePrice), 0) +
    otherAssets.gold.reduce((s, a) => s + Number(a.purchasePrice), 0);

  const fiCurrent = fixedIncome.fds.reduce((s, fd) => s + Number(fd.principal), 0) +
    Number(fixedIncome.ppf.balance) +
    fixedIncome.bonds.reduce((s, b) => s + Number(b.currentValue), 0);

  const otherCurrent = otherAssets.realEstate.reduce((s, a) => s + Number(a.currentValue), 0) +
    otherAssets.gold.reduce((s, a) => s + Number(a.currentValue), 0);

  const summary = {
    totalInvested: invSummary.totalInvested + fiInvested + otherInvested,
    totalCurrentValue: invSummary.totalCurrentValue + fiCurrent + otherCurrent,
    totalChangeTodayAmount: invSummary.totalChangeTodayAmount,
    totalChangeTodayPercent: invSummary.totalChangeTodayPercent,
  };

  // Asset mix for donut - Consolidate ALL sources
  const assetColors = {
    STOCKS: "#16a34a", MUTUAL_FUNDS: "#2563eb", BONDS: "#f97316",
    REAL_ESTATE: "#facc15", CRYPTO: "#a21caf", GOLD: "#d97706",
    FIXED_DEPOSIT: "#8b5cf6", PPF: "#3b82f6", OTHER: "#64748b",
  };
  const assetMixMap = {};

  // 1. Generic investments
  enriched.forEach((inv) => {
    assetMixMap[inv.type] = (assetMixMap[inv.type] || 0) + inv.currentValue;
  });

  // 2. Specific assets (to ensure chart matches total portfolio value)
  fixedIncome.fds.forEach(fd => assetMixMap["FIXED_DEPOSIT"] = (assetMixMap["FIXED_DEPOSIT"] || 0) + Number(fd.principal));
  if (fixedIncome.ppf.balance > 0) assetMixMap["PPF"] = (assetMixMap["PPF"] || 0) + Number(fixedIncome.ppf.balance);
  fixedIncome.bonds.forEach(b => assetMixMap["BONDS"] = (assetMixMap["BONDS"] || 0) + Number(b.currentValue));
  otherAssets.realEstate.forEach(r => assetMixMap["REAL_ESTATE"] = (assetMixMap["REAL_ESTATE"] || 0) + Number(r.currentValue));
  otherAssets.gold.forEach(g => assetMixMap["GOLD"] = (assetMixMap["GOLD"] || 0) + Number(g.currentValue));

  const assetMixData = Object.entries(assetMixMap).map(([type, value]) => ({
    name: type.replace(/_/g, " "),
    value,
    color: assetColors[type] || "#64748b",
  })).filter(item => item.value > 0);

  // Reminders
  const reminders = investments
    .filter((inv) => inv.notes && /due|reminder/i.test(inv.notes))
    .map((inv) => ({
      type: inv.name,
      due: new Date(inv.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }),
    }));

  const isPositiveDay = summary.totalChangeTodayPercent >= 0;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-semibold text-red-500">Failed to load investments</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-10 md:px-10">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-1">Investment Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Your Wealth Overview</h1>
            <p className="text-slate-400 text-sm">
              Live market prices for your portfolio
              {lastUpdated && (
                <span className="ml-2 text-emerald-400">· updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={marketLoading || loading}
            className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${marketLoading ? "animate-spin" : ""}`} />
            {marketLoading ? "Fetching..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* ── Stat cards ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8 -mt-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                title="Portfolio Value"
                value={summary.totalCurrentValue}
                subtitle="Current market value"
                icon={TrendingUp}
                iconClass="bg-emerald-100 text-emerald-600"
                valueClass="text-emerald-700"
              />
              <StatCard
                title="Total Invested"
                value={summary.totalInvested}
                subtitle="Your cost basis"
                icon={DollarSign}
                iconClass="bg-blue-100 text-blue-600"
              />
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Overall Returns</CardTitle>
                  <div className={`p-1.5 rounded-lg ${summary.totalInvested <= summary.totalCurrentValue ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${summary.totalInvested <= summary.totalCurrentValue ? "text-emerald-600" : "text-red-600"}`}>
                    {formatINR(Math.round(summary.totalCurrentValue - summary.totalInvested))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {((summary.totalCurrentValue - summary.totalInvested) / (summary.totalInvested || 1) * 100).toFixed(1)}% all-time growth
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Day's Movement</CardTitle>
                  <div className={`p-1.5 rounded-lg ${isPositiveDay ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {isPositiveDay ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${isPositiveDay ? "text-green-600" : "text-red-600"}`}>
                    {isPositiveDay ? "+" : ""}{formatINR(Math.round(summary.totalChangeTodayAmount))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isPositiveDay ? "▲" : "▼"} {Math.abs(summary.totalChangeTodayPercent).toFixed(2)}% market move today
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!loading && investments.length === 0 && <EmptyState />}

        {/* ── Main content ────────────────────────────────────────────────── */}
        {!loading && investments.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: live investment rows */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-slate-800">Your Investments</h2>
                {marketData && !marketLoading && (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Live Prices Active
                  </span>
                )}
                {!marketData && !marketLoading && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-medium flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Offline / No live data
                  </span>
                )}
              </div>
              {marketLoading && !marketData ? (
                <div className="space-y-3">
                  {Array.from({ length: investments.length || 3 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                enriched.map((inv) => <InvestmentRow key={inv.id} inv={inv} />)
              )}
            </div>

            {/* Right: Donut + recent activity */}
            <div className="space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Asset Mix</CardTitle>
                  <CardDescription className="text-xs">Portfolio diversification</CardDescription>
                </CardHeader>
                <CardContent className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetMixData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        labelLine={false}
                      >
                        {assetMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                        <DonutCenterLabel viewBox={{ cx: 0, cy: 0 }} total={summary.totalCurrentValue} />
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatINR(value)}
                        contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {assetMixData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Gold price card if user has gold */}
              {enriched.some((i) => i.type === "GOLD" && i.marketData?.pricePerGram) && (
                <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-yellow-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">🥇 Live Gold Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const g = enriched.find((i) => i.type === "GOLD")?.marketData;
                      return (
                        <>
                          <p className="text-2xl font-bold text-amber-700">
                            ₹{g.pricePerGram?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g
                          </p>
                          <p className="text-sm text-amber-600 mt-0.5">
                            ₹{g.pricePerOz?.toLocaleString("en-IN", { maximumFractionDigits: 0 })} per troy oz
                          </p>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
