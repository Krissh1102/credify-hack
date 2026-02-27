"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EmiCalculatorPage() {
  const [amount, setAmount] = useState(2500000);
  const [interest, setInterest] = useState(9);
  const [tenure, setTenure] = useState(15);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const { emi, totalPayment, totalInterest, chartData } = useMemo(() => {
    const principal = parseFloat(amount);
    const rate = parseFloat(interest) / 100 / 12;
    const months = parseFloat(tenure) * 12;

    if (!principal || !rate || !months) {
      return { emi: 0, totalPayment: 0, totalInterest: 0, chartData: [] };
    }

    const emiValue =
      (principal * rate * Math.pow(1 + rate, months)) /
      (Math.pow(1 + rate, months) - 1);
    const totalPaymentValue = emiValue * months;
    const totalInterestValue = totalPaymentValue - principal;

    const data = [
      { name: "Principal Amount", value: principal },
      { name: "Total Interest", value: totalInterestValue },
    ];

    return {
      emi: emiValue,
      totalPayment: totalPaymentValue,
      totalInterest: totalInterestValue,
      chartData: data,
    };
  }, [amount, interest, tenure]);

  const amortizationSchedule = useMemo(() => {
    const schedule = [];
    let balance = parseFloat(amount);
    const monthlyRate = parseFloat(interest) / 100 / 12;
    const totalMonths = parseFloat(tenure) * 12;

    if (!balance || !monthlyRate || !totalMonths || !emi) {
      return [];
    }

    for (let i = 1; i <= totalMonths; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;
      schedule.push({
        month: i,
        principal: principalPayment,
        interest: interestPayment,
        totalPayment: emi,
        balance: balance > 0 ? balance : 0,
      });
    }
    return schedule;
  }, [amount, interest, tenure, emi]);

  const COLORS = ["#0ea5e9", "#f97316"];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6  min-h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EMI Calculator</h1>
        <p className="text-muted-foreground">
          Plan your loan with our detailed EMI calculator and amortization schedule.
        </p>
      </div>

      <Card>
        <div className="grid md:grid-cols-2">
          <div className="p-6 space-y-8 border-b md:border-b-0 md:border-r">
            <div>
              <Label htmlFor="amount" className="text-base">
                Loan Amount
              </Label>
              <div className="mt-2 text-2xl font-bold ">
                {formatCurrency(amount)}
              </div>
              <Slider
                value={[amount]}
                onValueChange={(val) => setAmount(val[0])}
                max={10000000}
                step={100000}
                className="mt-3"
              />
            </div>
            <div>
              <Label htmlFor="interest" className="text-base">
                Interest Rate (% p.a.)
              </Label>
              <div className="mt-2 text-2xl font-bold ">
                {interest.toFixed(2)} %
              </div>
              <Slider
                value={[interest]}
                onValueChange={(val) => setInterest(val[0])}
                max={20}
                step={0.05}
                className="mt-3"
              />
            </div>
            <div>
              <Label htmlFor="tenure" className="text-base">
                Loan Tenure (Years)
              </Label>
              <div className="mt-2 text-2xl font-bold ">
                {tenure} Years
              </div>
              <Slider
                value={[tenure]}
                onValueChange={(val) => setTenure(val[0])}
                max={30}
                step={1}
                className="mt-3"
              />
            </div>
          </div>

          <div className="p-6 flex flex-col justify-center items-center gap-6">
            <div className="h-[200px] w-full max-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="text-muted-foreground">Monthly EMI</span>
                <strong className="text-primary">{formatCurrency(emi)}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Interest</span>
                <strong>{formatCurrency(totalInterest)}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Payment</span>
                <strong>{formatCurrency(totalPayment)}</strong>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amortization Schedule</CardTitle>
          <CardDescription>
            A month-by-month breakdown of your EMI payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader className="sticky top-0 ">
                <TableRow>
                  <TableHead className="w-[100px]">Month</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Total Payment</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amortizationSchedule.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell>{formatCurrency(row.principal)}</TableCell>
                    <TableCell>{formatCurrency(row.interest)}</TableCell>
                    <TableCell>{formatCurrency(row.totalPayment)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}