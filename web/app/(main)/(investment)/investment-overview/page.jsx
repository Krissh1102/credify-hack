"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  Repeat,
  Landmark,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { useEffect, useState } from "react";
import AiInsightWidget from "@/components/AiInsightWidget";

export default function DashboardOverview() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch investments from API
  const fetchInvestments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investments");
      if (!res.ok) throw new Error("Failed to fetch investments");
      const data = await res.json();
      setInvestments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Currency formatter must be defined before use
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate overview data from investments
  const investedAmount = investments.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0
  );
  // For demo, netWorth = investedAmount * 1.15, overallGrowth = 15%
  const netWorth = investedAmount * 1.15;
  const overallGrowth = netWorth - investedAmount;
  const overallGrowthPercent = investedAmount
    ? ((overallGrowth / investedAmount) * 100).toFixed(2)
    : 0;

  // Asset mix by type
  const assetMixMap = {};
  investments.forEach((inv) => {
    assetMixMap[inv.type] = (assetMixMap[inv.type] || 0) + Number(inv.amount);
  });
  const assetColors = {
    STOCKS: "#16a34a",
    MUTUAL_FUNDS: "#2563eb",
    BONDS: "#f97316",
    REAL_ESTATE: "#facc15",
    CRYPTO: "#a21caf",
    OTHER: "#64748b",
  };
  const assetMixData = Object.entries(assetMixMap).map(([type, value]) => ({
    name: type.replace("_", " "),
    value,
    color: assetColors[type] || "#64748b",
  }));

  // Recent activities: last 3 investments
  const iconMap = {
    STOCKS: <ShoppingCart className="h-6 w-6 text-green-500" />,
    MUTUAL_FUNDS: <Repeat className="h-6 w-6 text-blue-500" />,
    BONDS: <Landmark className="h-6 w-6 text-orange-500" />,
    REAL_ESTATE: <Landmark className="h-6 w-6 text-yellow-500" />,
    CRYPTO: <Repeat className="h-6 w-6 text-purple-500" />,
    OTHER: <ShoppingCart className="h-6 w-6 text-gray-500" />,
  };
  const recentActivities = [...investments]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3)
    .map((inv) => ({
      icon: iconMap[inv.type] || iconMap.OTHER,
      text: `Invested ${formatCurrency(inv.amount)} in ${inv.name}`,
      date: new Date(inv.date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }));

  // Reminders: investments with notes containing 'due' or 'reminder'
  const reminders = investments
    .filter((inv) => inv.notes && /due|reminder/i.test(inv.notes))
    .map((inv) => ({
      type: inv.name,
      due: new Date(inv.date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      amount: inv.amount,
    }));

  if (loading) {
    return <div className="p-8">Loading investments...</div>;
  }
  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Net Worth
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(netWorth)}</div>
            <p className="text-xs text-muted-foreground">
              Your complete financial picture
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Investments
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(investedAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all asset classes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Growth (P&L)
            </CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(overallGrowth)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{overallGrowthPercent}% all time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Upcoming Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {reminders.length === 0 ? (
              <span className="text-muted-foreground">No reminders</span>
            ) : (
              reminders.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between mb-1 last:mb-0"
                >
                  <span>{item.type}:</span>
                  <span className="font-semibold">{item.due}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Asset Mix</CardTitle>
              <CardDescription>
                How your investments are diversified.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetMixData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {assetMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivities.length === 0 ? (
                  <span className="text-muted-foreground">
                    No recent activity
                  </span>
                ) : (
                  recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 rounded-full">
                        {activity.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {activity.text}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.date}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <AiInsightWidget title="Investment Health" insightType="investment_health" />
        <AiInsightWidget title="Savings Rate" insightType="savings_rate" />
      </div>
    </div>
  );
}
