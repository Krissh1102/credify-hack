import React, { useState } from "react";

const RetirementPlanning = () => {
  const [currentAge, setCurrentAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(60);
  const [currentExpense, setCurrentExpense] = useState(30000);
  const [currentSavings, setCurrentSavings] = useState(500000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [inflation, setInflation] = useState(6);

  const [result, setResult] = useState(null);

  const calculateRetirement = () => {
    const years = retirementAge - currentAge;
    const months = years * 12;

    const inflationRate = inflation / 100;
    const monthlyReturn = expectedReturn / 100 / 12;

    // Future Monthly Expense
    const futureExpense =
      currentExpense * Math.pow(1 + inflationRate, years);

    // Required Corpus (25 years post retirement)
    const requiredCorpus = futureExpense * 12 * 25;

    // Future value of SIP
    const sipFutureValue =
      monthlyInvestment *
      ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);

    // Future value of current savings
    const savingsFutureValue =
      currentSavings * Math.pow(1 + expectedReturn / 100, years);

    const totalProjected = sipFutureValue + savingsFutureValue;

    const shortfall = requiredCorpus - totalProjected;

    const readinessScore = Math.min(
      100,
      (totalProjected / requiredCorpus) * 100
    );

    setResult({
      requiredCorpus,
      totalProjected,
      shortfall,
      readinessScore,
    });
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Retirement Planning</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
        {/* INPUT SECTION */}
        <div>
          <input type="number" placeholder="Current Age" value={currentAge} onChange={(e) => setCurrentAge(+e.target.value)} />
          <br /><br />

          <input type="number" placeholder="Retirement Age" value={retirementAge} onChange={(e) => setRetirementAge(+e.target.value)} />
          <br /><br />

          <input type="number" placeholder="Monthly Expense" value={currentExpense} onChange={(e) => setCurrentExpense(+e.target.value)} />
          <br /><br />

          <input type="number" placeholder="Current Savings" value={currentSavings} onChange={(e) => setCurrentSavings(+e.target.value)} />
          <br /><br />

          <input type="number" placeholder="Monthly Investment" value={monthlyInvestment} onChange={(e) => setMonthlyInvestment(+e.target.value)} />
          <br /><br />

          <input type="number" placeholder="Expected Return (%)" value={expectedReturn} onChange={(e) => setExpectedReturn(+e.target.value)} />
          <br /><br />

          <input type="number" placeholder="Inflation (%)" value={inflation} onChange={(e) => setInflation(+e.target.value)} />
          <br /><br />

          <button onClick={calculateRetirement}>Calculate</button>
        </div>

        {/* RESULT SECTION */}
        {result && (
          <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "10px" }}>
            <h3>Results</h3>

            <p><strong>Required Corpus:</strong> ₹{result.requiredCorpus.toLocaleString()}</p>

            <p><strong>Projected Wealth:</strong> ₹{result.totalProjected.toLocaleString()}</p>

            <p style={{ color: result.shortfall > 0 ? "red" : "green" }}>
              <strong>
                {result.shortfall > 0
                  ? `Shortfall: ₹${result.shortfall.toLocaleString()}`
                  : "You are fully prepared 🎉"}
              </strong>
            </p>

            <p><strong>Retirement Readiness:</strong> {result.readinessScore.toFixed(1)}%</p>

            <div style={{
              height: "10px",
              background: "#ddd",
              borderRadius: "5px",
              marginTop: "10px"
            }}>
              <div style={{
                width: `${result.readinessScore}%`,
                height: "100%",
                background: result.readinessScore > 70 ? "green" : "orange",
                borderRadius: "5px"
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetirementPlanning;