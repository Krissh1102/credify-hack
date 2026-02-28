"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9FA8DA",
];

export function DashboardOverview({ accounts, transactions }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id
  );

  // Filter transactions for selected account
  const accountTransactions = transactions.filter(
    (t) => t.accountId === selectedAccountId
  );

  // Get recent transactions (last 5)
  const recentTransactions = accountTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // Calculate expense breakdown for current month
  const currentDate = new Date();
  const currentMonthExpenses = accountTransactions.filter((t) => {
    const transactionDate = new Date(t.date);
    return (
      t.type === "EXPENSE" &&
      transactionDate.getMonth() === currentDate.getMonth() &&
      transactionDate.getFullYear() === currentDate.getFullYear()
    );
  });

  // Group expenses by category
  const expensesByCategory = currentMonthExpenses.reduce((acc, transaction) => {
    const category = transaction.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += transaction.amount;
    return acc;
  }, {});

  // Format data for pie chart
  const pieChartData = Object.entries(expensesByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Recent Transactions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-normal">
            Recent Transactions
          </CardTitle>
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent transactions
              </p>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.description || "Untitled Transaction"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.date), "PP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex items-center",
                        transaction.type === "EXPENSE"
                          ? "text-red-500"
                          : "text-green-500"
                      )}
                    >
                      {transaction.type === "EXPENSE" ? (
                        <ArrowDownRight className="mr-1 h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="mr-1 h-4 w-4" />
                      )}
                      {transaction.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Monthly Expense Breakdown
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-2 pb-6">
          {pieChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No expenses this month
            </p>
          ) : (
            <>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      cornerRadius={10}
                      stroke="none"
                      isAnimationActive
                      animationDuration={800}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          style={{
                            filter:
                              "drop-shadow(0px 6px 14px rgba(0,0,0,0.08))",
                          }}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => [
                        `₹${value.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}`,
                      ]}
                      contentStyle={{
                        borderRadius: "14px",
                        border: "none",
                        boxShadow:
                          "0 10px 30px rgba(0,0,0,0.12)",
                        fontSize: "13px",
                      }}
                    />

                    {/* Center Total */}
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x="50%"
                        dy="-6"
                        className="text-sm fill-slate-400"
                      >
                        Total Spent
                      </tspan>
                      <tspan
                        x="50%"
                        dy="20"
                        className="text-xl font-bold fill-slate-800"
                      >
                        ₹
                        {pieChartData
                          .reduce((acc, cur) => acc + cur.value, 0)
                          .toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Legend */}
              <div className="mt-4 flex flex-wrap gap-3 justify-center text-sm">
                {pieChartData.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-2 text-slate-600"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          COLORS[index % COLORS.length],
                      }}
                    />
                    {entry.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}