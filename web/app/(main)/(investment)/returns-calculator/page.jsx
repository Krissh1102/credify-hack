// ./components/FinancialCalculatorsPage.jsx

"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// --- HELPER FUNCTION ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// --- SIP CALCULATOR ---
const SIPCalculator = () => {
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000);
  const [rateOfReturn, setRateOfReturn] = useState(12);
  const [duration, setDuration] = useState(10);

  const { investedAmount, estimatedReturns, futureValue, chartData } =
    useMemo(() => {
      const i = rateOfReturn / 100 / 12; // Monthly interest rate
      const n = duration * 12; // Total number of months

      const futureValue = (monthlyInvestment * (Math.pow(1 + i, n) - 1)) / i;
      const investedAmount = monthlyInvestment * n;
      const estimatedReturns = futureValue - investedAmount;

      // Generate data for the chart
      const data = [];
      for (let year = 1; year <= duration; year++) {
        const months = year * 12;
        const value = (monthlyInvestment * (Math.pow(1 + i, months) - 1)) / i;
        data.push({
          year: `Year ${year}`,
          invested: monthlyInvestment * months,
          value: Math.round(value),
        });
      }

      return {
        investedAmount,
        estimatedReturns,
        futureValue,
        chartData: data,
      };
    }, [monthlyInvestment, rateOfReturn, duration]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SIP Growth Calculator</CardTitle>
        <CardDescription>
          Estimate the future value of your monthly investments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium">
                Monthly Investment (₹)
              </label>
              <Input
                type="number"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                className="mt-1"
              />
              <Slider
                value={[monthlyInvestment]}
                onValueChange={(val) => setMonthlyInvestment(val[0])}
                max={100000}
                step={1000}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Expected Return Rate (% p.a.)
              </label>
              <Input
                type="number"
                value={rateOfReturn}
                onChange={(e) => setRateOfReturn(Number(e.target.value))}
                className="mt-1"
              />
              <Slider
                value={[rateOfReturn]}
                onValueChange={(val) => setRateOfReturn(val[0])}
                max={30}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Investment Duration (Years)
              </label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1"
              />
              <Slider
                value={[duration]}
                onValueChange={(val) => setDuration(val[0])}
                max={40}
                step={1}
                className="mt-2"
              />
            </div>
          </div>

          {/* Results and Chart Section */}
          <div className="flex flex-col">
            <Card className=" p-6 text-center">
              <p className="text-sm text-muted-foreground">Future Value</p>
              <p className="text-4xl font-bold text-green-600">
                {formatCurrency(futureValue)}
              </p>
              <div className="flex justify-around mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invested</p>
                  <p className="font-semibold">
                    {formatCurrency(investedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Returns</p>
                  <p className="font-semibold">
                    {formatCurrency(estimatedReturns)}
                  </p>
                </div>
              </div>
            </Card>
            <div className="flex-grow mt-4 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `₹${value / 100000}L`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="invested"
                    name="Total Invested"
                    stroke="#8884d8"
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Future Value"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- FD CALCULATOR ---
const FDCalculator = () => {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.0);
  const [tenure, setTenure] = useState(5);

  const { maturityAmount, totalInterest } = useMemo(() => {
    const r = rate / 100;
    const n = 4; // Compounded quarterly
    const t = tenure;
    const maturityAmount = principal * Math.pow(1 + r / n, n * t);
    const totalInterest = maturityAmount - principal;
    return { maturityAmount, totalInterest };
  }, [principal, rate, tenure]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixed Deposit (FD) Calculator</CardTitle>
        <CardDescription>
          Calculate the maturity value of a lump sum investment.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium">Principal Amount (₹)</label>
            <Input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="mt-1"
            />
            <Slider
              value={[principal]}
              onValueChange={(v) => setPrincipal(v[0])}
              max={5000000}
              step={10000}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Annual Interest Rate (%)
            </label>
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1"
            />
            <Slider
              value={[rate]}
              onValueChange={(v) => setRate(v[0])}
              max={10}
              step={0.1}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tenure (Years)</label>
            <Input
              type="number"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="mt-1"
            />
            <Slider
              value={[tenure]}
              onValueChange={(v) => setTenure(v[0])}
              max={20}
              step={1}
              className="mt-2"
            />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Card className=" p-8 text-center w-full max-w-sm">
            <p className="text-sm text-muted-foreground">Maturity Amount</p>
            <p className="text-4xl font-bold text-green-600">
              {formatCurrency(maturityAmount)}
            </p>
            <div className="flex justify-around mt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Principal</p>
                <p className="font-semibold">{formatCurrency(principal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Interest</p>
                <p className="font-semibold">{formatCurrency(totalInterest)}</p>
              </div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

// --- PPF CALCULATOR ---
const PPFCalculator = () => {
  const [annualInvestment, setAnnualInvestment] = useState(150000);
  const PPF_RATE = 7.1; // Current rate, can be updated

  const { maturityValue, totalInvestment, totalInterest } = useMemo(() => {
    let balance = 0;
    for (let year = 0; year < 15; year++) {
      balance += annualInvestment;
      balance = balance * (1 + PPF_RATE / 100);
    }
    const totalInvestment = annualInvestment * 15;
    const totalInterest = balance - totalInvestment;
    return { maturityValue: balance, totalInvestment, totalInterest };
  }, [annualInvestment]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Provident Fund (PPF) Calculator</CardTitle>
        <CardDescription>
          Estimate your PPF maturity amount after the 15-year lock-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium">Annual Investment (₹)</label>
            <Input
              type="number"
              value={annualInvestment}
              onChange={(e) => setAnnualInvestment(Number(e.target.value))}
              className="mt-1"
            />
            <Slider
              value={[annualInvestment]}
              onValueChange={(v) => setAnnualInvestment(v[0])}
              min={500}
              max={150000}
              step={500}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Interest Rate (p.a.)</label>
            <Input type="number" value={PPF_RATE} disabled className="mt-1 " />
            <p className="text-xs text-muted-foreground mt-1">
              Current PPF rate is set by the government.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Card className=" p-8 text-center w-full max-w-sm">
            <p className="text-sm text-muted-foreground">
              Maturity Value (after 15 years)
            </p>
            <p className="text-4xl font-bold text-green-600">
              {formatCurrency(maturityValue)}
            </p>
            <div className="flex justify-around mt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Invested</p>
                <p className="font-semibold">
                  {formatCurrency(totalInvestment)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Interest</p>
                <p className="font-semibold">{formatCurrency(totalInterest)}</p>
              </div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

// --- MAIN PAGE COMPONENT ---

export default function FinancialCalculatorsPage() {
  return (
    <div className="p-4 md:p-8 min-h-screen">
      <h1 className="text-3xl font-bold  mb-2">
        Financial Calculators
      </h1>
      <p className="text-muted-foreground mb-6">
        Plan your investments and estimate your future wealth.
      </p>

      <Tabs defaultValue="sip" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sip">SIP Calculator</TabsTrigger>
          <TabsTrigger value="fd">FD Calculator</TabsTrigger>
          <TabsTrigger value="ppf">PPF Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="sip" className="mt-6">
          <SIPCalculator />
        </TabsContent>

        <TabsContent value="fd" className="mt-6">
          <FDCalculator />
        </TabsContent>

        <TabsContent value="ppf" className="mt-6">
          <PPFCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
