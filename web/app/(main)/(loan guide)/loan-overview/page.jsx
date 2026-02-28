"use client";

import React, { useEffect, useState } from "react";
import {
  Landmark,
  Calendar,
  Wallet,
  Percent,
  PlusCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function LoanOverviewPage() {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [newLoan, setNewLoan] = useState({
    lender: "",
    type: "",
    principalAmount: "",
    interestRate: "",
    emiAmount: "",
    nextPaymentDate: "",
  });

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/loans");
      if (!res.ok) throw new Error("Failed to fetch loans");
      const data = await res.json();
      setLoans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLoan = async () => {
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLoan),
      });
      if (!res.ok) throw new Error("Failed to add loan");
      const data = await res.json();
      setLoans([data, ...loans]);
      setShowForm(false);
      setNewLoan({
        lender: "",
        type: "",
        principalAmount: "",
        interestRate: "",
        emiAmount: "",
        nextPaymentDate: "",
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const activeLoans = loans.filter((loan) => loan.status === "ACTIVE");
  const totalOutstanding = activeLoans.reduce(
    (acc, loan) => acc + parseFloat(loan.outstandingBalance),
    0
  );
  const totalPrincipal = loans.reduce(
    (acc, loan) => acc + parseFloat(loan.principalAmount),
    0
  );
  const totalPaid = totalPrincipal - totalOutstanding;

  const nextPayment =
    activeLoans.length > 0
      ? activeLoans.reduce((earliest, loan) => {
        if (!earliest) return loan;
        if (!loan.nextPaymentDate) return earliest;
        if (!earliest.nextPaymentDate) return loan;
        return new Date(loan.nextPaymentDate) <
          new Date(earliest.nextPaymentDate)
          ? loan
          : earliest;
      }, null)
      : null;

  const loanTypeData = activeLoans.reduce((acc, loan) => {
    const existing = acc.find((item) => item.name === loan.type);
    if (existing) {
      existing.value += parseFloat(loan.outstandingBalance);
    } else {
      acc.push({ name: loan.type, value: parseFloat(loan.outstandingBalance) });
    }
    return acc;
  }, []);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Overview</h1>
          <p className="text-muted-foreground">
            A complete snapshot of your current debt portfolio.
          </p>
        </div>
        <Link href="loans/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Loan
          </Button>
        </Link>
      </div>

      {/* Add Loan Form */}
      {showForm && (
        <Card className="mb-6 p-4">
          <CardHeader>
            <CardTitle>Add New Loan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Lender"
              value={newLoan.lender}
              onChange={(e) =>
                setNewLoan({ ...newLoan, lender: e.target.value })
              }
            />
            <Input
              placeholder="Loan Type"
              value={newLoan.type}
              onChange={(e) => setNewLoan({ ...newLoan, type: e.target.value })}
            />
            <Input
              placeholder="Principal Amount"
              type="number"
              value={newLoan.principalAmount}
              onChange={(e) =>
                setNewLoan({ ...newLoan, principalAmount: e.target.value })
              }
            />
            <Input
              placeholder="Interest Rate (%)"
              type="number"
              value={newLoan.interestRate}
              onChange={(e) =>
                setNewLoan({ ...newLoan, interestRate: e.target.value })
              }
            />
            <Input
              placeholder="EMI Amount (optional)"
              type="number"
              value={newLoan.emiAmount}
              onChange={(e) =>
                setNewLoan({ ...newLoan, emiAmount: e.target.value })
              }
            />
            <Input
              placeholder="Next Payment Date"
              type="date"
              value={newLoan.nextPaymentDate}
              onChange={(e) =>
                setNewLoan({ ...newLoan, nextPaymentDate: e.target.value })
              }
            />
            <Button className="col-span-full mt-2" onClick={handleAddLoan}>
              Save Loan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Outstanding
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {activeLoans.length} active loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Next Payment Due
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextPayment?.nextPaymentDate && nextPayment?.emiAmount
                ? formatCurrency(nextPayment.emiAmount)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextPayment?.nextPaymentDate
                ? `On ${new Date(
                  nextPayment.nextPaymentDate
                ).toLocaleDateString()}`
                : "No upcoming payments"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Principal Paid
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Towards a total of {formatCurrency(totalPrincipal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Interest Rate
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                activeLoans.reduce(
                  (acc, loan) => acc + parseFloat(loan.interestRate),
                  0
                ) / (activeLoans.length || 1)
              ).toFixed(2)}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Weighted average across active loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Outstanding Balance Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of your debt across different loan types
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 pb-6">
            {loanTypeData.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                No active loans
              </p>
            ) : (
              <>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={loanTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={125}
                        paddingAngle={4}
                        dataKey="value"
                        cornerRadius={12}
                        stroke="none"
                        isAnimationActive
                        animationDuration={800}
                        label={({ name, percent, x, y, textAnchor }) => (
                          <text
                            x={x}
                            y={y}
                            fill="#475569"
                            textAnchor={textAnchor}
                            dominantBaseline="central"
                            className="text-xs font-medium"
                          >
                            {name} ({(percent * 100).toFixed(0)}%)
                          </text>
                        )}
                        labelLine={false}
                      >
                        {loanTypeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            style={{
                              filter: "drop-shadow(0px 6px 14px rgba(0,0,0,0.08))",
                            }}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value, name) => [
                          formatCurrency(value),
                          name,
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
                          Total Debt
                        </tspan>
                        <tspan
                          x="50%"
                          dy="20"
                          className="text-xl font-bold fill-slate-800"
                        >
                          {formatCurrency(
                            loanTypeData.reduce(
                              (acc, cur) => acc + cur.value,
                              0
                            )
                          )}
                        </tspan>
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
                  {loanTypeData.map((entry, index) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Total Repayment Progress</CardTitle>
            <CardDescription>
              You're on your way to being debt-free!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px] gap-4">
            <div className="text-4xl font-bold text-emerald-600">
              {((totalPaid / (totalPrincipal || 1)) * 100).toFixed(1)}%
            </div>
            <Progress
              value={(totalPaid / (totalPrincipal || 1)) * 100}
              className="w-full"
            />
            <p className="text-center text-sm text-muted-foreground mt-2">
              You have paid off <strong>{formatCurrency(totalPaid)}</strong> out
              of a total <strong>{formatCurrency(totalPrincipal)}</strong>{" "}
              borrowed.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
          <CardDescription>
            A detailed list of all your active and completed loans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan Name</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-center">Interest Rate</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Next Payment</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <div className="font-medium">{loan.lender}</div>
                    <div className="text-sm text-muted-foreground">
                      {loan.type} Loan
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(loan.outstandingBalance)}
                  </TableCell>
                  <TableCell className="text-center">
                    {parseFloat(loan.interestRate).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={loan.status === "ACTIVE" ? "default" : "outline"}
                    >
                      {loan.status === "ACTIVE" ? "Active" : "Paid Off"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      {loan.emiAmount ? formatCurrency(loan.emiAmount) : "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {loan.nextPaymentDate
                        ? new Date(loan.nextPaymentDate).toLocaleDateString()
                        : "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Make a Payment</DropdownMenuItem>
                        <DropdownMenuItem>View Documents</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
