"use client";
import React, { useState } from "react";
import { useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const RetirementPlanning = () => {
  const [currentAge, setCurrentAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(60);
  const [currentExpense, setCurrentExpense] = useState(30000);
  const [currentSavings, setCurrentSavings] = useState(500000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [inflation, setInflation] = useState(6);

  useEffect(() => {
    calculateRetirement();
  }, [
    currentAge,
    retirementAge,
    currentExpense,
    currentSavings,
    monthlyInvestment,
    expectedReturn,
    inflation
  ]);

  const [result, setResult] = useState(null);

  const calculateRetirement = () => {
  const years = retirementAge - currentAge;
  const retirementYears = 25;

  if (years <= 0) return;

  const inflationRate = inflation / 100;
  const returnRate = expectedReturn / 100;

  // 1️⃣ Future Annual Expense
  const futureAnnualExpense =
    currentExpense *
    Math.pow(1 + inflationRate, years) *
    12;

  // 2️⃣ Real Return
  const realReturn =
    (1 + returnRate) / (1 + inflationRate) - 1;

  // 3️⃣ Required Corpus (Present Value Formula)
  const requiredCorpus =
    futureAnnualExpense *
    ((1 - Math.pow(1 + realReturn, -retirementYears)) /
      realReturn);

  // 4️⃣ Wealth Accumulation Before Retirement
  let total = currentSavings;
  const yearlyData = [];

  for (let i = 1; i <= years; i++) {
  total =
    (total + monthlyInvestment * 12) *
    (1 + returnRate);

  if (i % 5 === 0 || i === years) {
    yearlyData.push({
      age: currentAge + i,
      wealth: Math.round(total),
    });
  }
}

  const totalProjected = total;
  const shortfall = requiredCorpus - totalProjected;

  const readinessScore = Math.min(
    100,
    (totalProjected / requiredCorpus) * 100
  );

  setResult({
    requiredCorpus: Math.round(requiredCorpus),
    totalProjected: Math.round(totalProjected),
    shortfall: Math.round(shortfall),
    readinessScore,
    yearlyData,
  });
};

  const Input = ({ label, value, setValue }) => (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(+e.target.value)}
        className="w-full border rounded-xl p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  );
  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-semibold mb-6">
        Retirement Planning
      </h2>

      <div className="flex gap-8">

        {/* LEFT SIDE */}
        <div className="w-1/2 bg-white shadow-md rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">
            Plan Details
          </h3>

          <div className="space-y-4">
            <Input label="Current Age" value={currentAge} setValue={setCurrentAge} />
            <Input label="Retirement Age" value={retirementAge} setValue={setRetirementAge} />
            <Input label="Monthly Expense (₹)" value={currentExpense} setValue={setCurrentExpense} />
            <Input label="Current Savings (₹)" value={currentSavings} setValue={setCurrentSavings} />
            <Input label="Monthly Investment (₹)" value={monthlyInvestment} setValue={setMonthlyInvestment} />
            <Input label="Expected Return (%)" value={expectedReturn} setValue={setExpectedReturn} />
            <Input label="Inflation (%)" value={inflation} setValue={setInflation} />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-1/2 flex flex-col gap-6">

          {result && (
            <>
              {/* SUMMARY */}
              <div className="bg-white shadow-md rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Retirement Summary
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Required Corpus</span>
                    <span className="font-semibold">
                      ₹{result.requiredCorpus.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Projected Wealth</span>
                    <span className="font-semibold">
                      ₹{result.totalProjected.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Shortfall</span>
                    <span className={`font-semibold ${result.shortfall > 0 ? "text-red-500" : "text-green-500"}`}>
                      {result.shortfall > 0
                        ? `₹${result.shortfall.toLocaleString()}`
                        : "Fully Prepared"}
                    </span>
                  </div>

                  <div>
                    <p className="mb-2 font-medium">
                      Retirement Readiness: {result.readinessScore.toFixed(1)}%
                    </p>

                    <div className="w-full bg-gray-200 h-3 rounded-full">
                      <div
                        className="h-3 rounded-full bg-green-500"
                        style={{ width: `${result.readinessScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CHART */}
              <div className="bg-white shadow-md rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Wealth Growth Projection
                </h3>

                <ResponsiveContainer width="100%" height={280}>
  <LineChart
    data={result.yearlyData}
    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
  >
    <XAxis
      dataKey="age"
      tick={{ fontSize: 12 }}
      axisLine={false}
      tickLine={false}
    />

    <YAxis
      tickFormatter={(value) => {
        if (value >= 10000000)
          return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000)
          return `₹${(value / 100000).toFixed(0)}L`;
        return value;
      }}
      tick={{ fontSize: 12 }}
      axisLine={false}
      tickLine={false}
      width={80}
    />

    <Tooltip
      formatter={(value) => `₹${value.toLocaleString()}`}
      contentStyle={{
        borderRadius: "12px",
        border: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}
    />

    <Line
      type="monotone"
      dataKey="wealth"
      stroke="#16a34a"
      strokeWidth={3}
      dot={false}
      activeDot={{ r: 6 }}
    />
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
  </LineChart>
  
</ResponsiveContainer>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};

export default RetirementPlanning;