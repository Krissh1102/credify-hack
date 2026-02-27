"use client"
import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

function calcEMI(principal, annualR, months){
  const r = annualR / 100 / 12;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return principal * r * pow / (pow - 1);
}

function EMICalculator({ principal, years, annualRate }){
  const months = years * 12;
  const emi = calcEMI(principal, annualRate, months);
  const totalPayable = emi * months;
  const totalInterest = totalPayable - principal;
  
  return (
    <div className="p-4 border rounded-lg bg-slate-50 mt-6">
      <h4 className="font-bold text-lg mb-4 text-slate-800">EMI Calculation Results</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-slate-500">Loan Amount (Principal)</div>
          <div className="text-lg font-semibold text-slate-800">₹{principal.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Loan Tenure</div>
          <div className="text-lg font-semibold text-slate-800">{years} {years === 1 ? 'year' : 'years'}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="p-4 border rounded-lg bg-white">
          <div className="text-sm text-slate-500">Monthly EMI</div>
          <div className="text-xl font-semibold text-blue-600">₹{Math.round(emi).toLocaleString()}</div>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <div className="text-sm text-slate-500">Total Interest Payable</div>
          <div className="text-xl font-semibold text-slate-800">₹{Math.round(totalInterest).toLocaleString()}</div>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <div className="text-sm text-slate-500">Total Amount Payable</div>
          <div className="text-xl font-semibold text-slate-800">₹{Math.round(totalPayable).toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}

export default function InteractiveSimulator(){
  const [amount, setAmount] = useState(10000)
  const [periodYears, setPeriodYears] = useState(10)
  const [annualReturn, setAnnualReturn] = useState(12)
  const [option, setOption] = useState('compare')
  const [inflation, setInflation] = useState(6)

  const monthlyRate = annualReturn / 100 / 12
  const months = periodYears * 12

  const chartData = useMemo(()=>{
    const data = []
    let sipBal = 0
    let lumpBal = amount
    const monthlyInvestment = amount

    for (let m = 0; m <= months; m++){
      if (m === 0){
        data.push({ month: m, label: `Start`, SIP: 0, "Lump Sum": lumpBal, "Real Value (Lump Sum)": lumpBal })
        continue
      }
      sipBal = sipBal * (1 + monthlyRate) + monthlyInvestment
      lumpBal = lumpBal * (1 + monthlyRate)
      const inflationAdjLump = lumpBal / Math.pow(1 + inflation/100, m/12)
      
      if (m % 12 === 0 || m === months) {
        data.push({ 
            month: m, 
            label: `${m/12} yr`, 
            SIP: Math.round(sipBal), 
            "Lump Sum": Math.round(lumpBal), 
            "Real Value (Lump Sum)": Math.round(inflationAdjLump) 
        })
      }
    }
    return data
  }, [amount, months, monthlyRate, inflation])

  const finalSIP = chartData.length ? chartData[chartData.length - 1].SIP : 0
  const finalLump = chartData.length ? chartData[chartData.length - 1]['Lump Sum'] : 0

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Interactive Finance Simulator</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 border-b pb-6">
        <div>
          <label className="text-sm font-medium text-slate-600">Amount (Monthly SIP / Loan Principal)</label>
          <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Period (Years)</label>
          <input type="number" value={periodYears} onChange={e=>setPeriodYears(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Annual Return / Interest Rate (%)</label>
          <input type="number" value={annualReturn} onChange={e=>setAnnualReturn(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Assumed Inflation (%)</label>
          <input type="number" value={inflation} onChange={e=>setInflation(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg mt-1" disabled={option === 'emi'} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Calculator Mode</label>
          <select value={option} onChange={e=>setOption(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg mt-1 bg-white">
            <option value="compare">Compare SIP vs. Lump Sum</option>
            <option value="emi">Loan EMI Calculator</option>
          </select>
        </div>
      </div>

      {option === 'emi' ? (
        <EMICalculator principal={amount} years={periodYears} annualRate={annualReturn} />
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="text-sm text-slate-500">Total Invested (SIP)</div>
              <div className="text-2xl font-semibold text-slate-800">₹{(amount * months).toLocaleString()}</div>
            </div>
            <div className="p-4 border rounded-lg bg-green-50">
              <div className="text-sm text-green-700">Future Value (SIP)</div>
              <div className="text-2xl font-semibold text-green-800">₹{finalSIP.toLocaleString()}</div>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="text-sm text-blue-700">Future Value (Lump Sum)</div>
              <div className="text-2xl font-semibold text-blue-800">₹{finalLump.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(value) => `₹${(value/100000).toFixed(0)}L`} />
                <Tooltip formatter={(value)=>`₹${Number(value).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="SIP" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Lump Sum" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Real Value (Lump Sum)" name="Real Value (after Inflation)" stroke="#ef4444" strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}