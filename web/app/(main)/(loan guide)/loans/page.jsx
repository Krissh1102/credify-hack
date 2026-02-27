// app/loans/page.jsx (or wherever your component is located)

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Landmark, Repeat, Home, Car, Briefcase, GraduationCap } from "lucide-react";
import AiInsightWidget from "@/components/AiInsightWidget";

// Helper to get the correct icon based on loan type
const getLoanIcon = (type) => {
  switch (type) {
    case "HOME":
      return <Home className="h-5 w-5 text-blue-500" />;
    case "AUTO":
      return <Car className="h-5 w-5 text-green-500" />;
    case "PERSONAL":
      return <Briefcase className="h-5 w-5 text-purple-500" />;
    case "EDUCATION":
      return <GraduationCap className="h-5 w-5 text-orange-500" />;
    default:
      return <Landmark className="h-5 w-5 text-gray-500" />;
  }
};

export default function MyLoansPage() {
  const [allLoans, setAllLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const response = await fetch("/api/loans");
        if (!response.ok) {
          // You can get the status text for a better error message
          const errorText = await response.text();
          throw new Error(`Failed to fetch loans: ${response.status} ${errorText}`);
        }
        const data = await response.json();

        // Convert string decimal values back to numbers for calculations
        const formattedData = data.map(loan => ({
          ...loan,
          principalAmount: parseFloat(loan.principalAmount),
          outstandingBalance: parseFloat(loan.outstandingBalance),
          interestRate: parseFloat(loan.interestRate),
          emiAmount: parseFloat(loan.emiAmount),
        }));

        setAllLoans(formattedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoans();
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeLoans = allLoans.filter((loan) => loan.status === "ACTIVE");
  const paidLoans = allLoans.filter((loan) => loan.status === "PAID_OFF");

  const totalOutstanding = activeLoans.reduce(
    (sum, loan) => sum + loan.outstandingBalance,
    0
  );
  const totalMonthlyEMI = activeLoans.reduce(
    (sum, loan) => sum + loan.emiAmount,
    0
  );

  if (isLoading) {
    return <div className="p-6">Loading your loans...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  const LoanTable = ({ loans }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Loan Details</TableHead>
          <TableHead>Outstanding Balance</TableHead>
          <TableHead>Monthly EMI</TableHead>
          <TableHead>Next Due Date</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans.map((loan) => (
          <TableRow key={loan.id}>
            <TableCell>
              <Link href={`/loans/${loan.id}`} className="flex items-center gap-3 group">
                <div className="flex-shrink-0">{getLoanIcon(loan.type)}</div>
                <div>
                  <div className="font-medium group-hover:underline">{loan.lender}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {loan.type.toLowerCase()} Loan
                  </div>
                </div>
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/loans/${loan.id}`} className="block">
                <div className="font-mono">{formatCurrency(loan.outstandingBalance)}</div>
                <div className="text-xs text-muted-foreground">of {formatCurrency(loan.principalAmount)}</div>
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/loans/${loan.id}`} className="block font-mono">
                {formatCurrency(loan.emiAmount)}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/loans/${loan.id}`} className="block">
                {formatDate(loan.nextPaymentDate)}
              </Link>
            </TableCell>
            <TableCell className="text-center">
              <Link href={`/loans/${loan.id}`} className="block">
                <Badge variant={loan.status === "ACTIVE" ? "default" : "outline"}>
                  {loan.status === "PAID_OFF" ? "Paid Off" : "Active"}
                </Badge>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    // The rest of your JSX is the same as before...
    <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-full">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Loans</h1>
          <p className="text-muted-foreground">
            View and manage all your loan accounts in one place.
          </p>
        </div>
        <Link href="/loans/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Loan
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Across {activeLoans.length} active loans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly EMI</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyEMI)}</div>
            <p className="text-xs text-muted-foreground">Total of all monthly payments</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Debt Insight */}
      <AiInsightWidget
        title="Debt Optimization"
        insightType="debt_optimization"
      />

      {/* Tabs and Table Section */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="active">
            <div className="border-b p-4">
              <TabsList>
                <TabsTrigger value="active">Active Loans</TabsTrigger>
                <TabsTrigger value="paid">Paid Off Loans</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="active" className="p-4">
              <LoanTable loans={activeLoans} />
            </TabsContent>
            <TabsContent value="paid" className="p-4">
              <LoanTable loans={paidLoans} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}