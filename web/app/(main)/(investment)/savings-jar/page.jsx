"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

function JarSetupModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const handleSave = () => {
    const goalAmount = parseFloat(goal.replace(/[^0-9.]/g, ""));
    if (name.trim() && goalAmount > 0) {
      onSave({ name: name.trim(), goal: goalAmount });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-opacity-95 border backdrop-blur-sm flex items-center  min-h-screen justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className=" rounded-2xl bg-white dark:bg-black shadow-xl p-6 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold  mb-4 text-center">
          Create a New Savings Jar
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="jarName"
              className="block text-sm font-medium  mb-1"
            >
              Jar Name
            </label>
            <input
              id="jarName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Vacation Fund"
              className="w-full border rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="jarGoal" className="block text-sm font-medium mb-1">
              Goal Amount
            </label>
            <input
              id="jarGoal"
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., 50000"
              className="w-full border rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} variant="destructive">
            Cancel
          </Button>
          <Button onClick={handleSave}>Create Jar</Button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Refactored Child Component (for displaying a single jar) ---
function SavingsJar({ jar, onUpdate, onDelete }) {
  const [input, setInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");

  const { goal, saved } = jar;
  // Always read history from the API-persisted recentDeposits field
  const history = Array.isArray(jar.recentDeposits) ? jar.recentDeposits : [];

  const progress = useMemo(
    () => Math.min(1, goal > 0 ? saved / goal : 0),
    [saved, goal]
  );
  const percent = Math.round(progress * 100);

  // SVG & Animation Constants
  const jarBodyPath =
    "M 40 230 Q 30 230 30 220 V 80 Q 30 50 60 50 H 140 Q 170 50 170 80 V 220 Q 170 230 160 230 Z";
  const jarRimPath = "M 50 50 V 30 H 150 V 50";
  const fillableSvgHeight = 170;

  const fillLevelTransformY = useMemo(
    () => fillableSvgHeight * (1 - progress),
    [progress]
  );

  function formatRupee(v) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);
  }

  function addDeposit(amount) {
    if (!amount || amount <= 0) return;
    // Backend will handle updating recentDeposits + currentAmount
    onUpdate({ ...jar, depositDelta: amount });
    setInput("");
  }

  function withdrawAmount(amount) {
    if (!amount || amount <= 0 || amount > saved) return;
    // Negative depositDelta = withdrawal
    onUpdate({ ...jar, depositDelta: -amount });
    setWithdrawInput("");
  }

  function handleAddClick() {
    const amt = parseFloat(input.replace(/[^0-9.]/g, ""));
    if (!amt || amt <= 0) return;
    addDeposit(amt);
    setInput("");
  }

  function handleWithdrawClick() {
    const amt = parseFloat(withdrawInput.replace(/[^0-9.]/g, ""));
    if (!amt || amt <= 0) return;
    withdrawAmount(amt);
  }

  function handleSetGoal() {
    const amt = parseFloat(goalInput.replace(/[^0-9.]/g, ""));
    if (!amt || amt <= 0) return;
    onUpdate({ ...jar, goal: amt });
    setGoalInput("");
  }

  // Removed useEffect for drops cleanup
  // useEffect(() => {
  //   if (!drops.length) return;
  //   const t = setTimeout(() => setDrops((d) => d.slice(Math.floor(d.length / 2))), 1200);
  //   return () => clearTimeout(t);
  // }, [drops]);

  const jarColors = percent >= 100
    ? { fill: "#059669", wave: "#34d399" }
    : percent >= 60
      ? { fill: "#0ea5e9", wave: "#38bdf8" }
      : { fill: "#34d399", wave: "#6ee7b7" };

  return (
    <div className="border-0 shadow-lg rounded-2xl p-6 flex flex-col md:flex-row gap-6 font-sans w-full bg-white">
      <div className="flex-1 flex flex-col items-center">
        <h3 className="text-xl font-bold mb-2 text-slate-800">{jar.name}</h3>
        <div className="relative w-56 h-72">
          <svg viewBox="0 0 200 260" className="w-full h-full">
            <defs>
              <clipPath id={`jarBodyClip-${jar.id}`}>
                <path d={jarBodyPath} />
              </clipPath>
              {/* shimmer wave gradient */}
              <linearGradient id={`waveGrad-${jar.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={jarColors.wave} stopOpacity="0.9" />
                <stop offset="100%" stopColor={jarColors.fill} stopOpacity="1" />
              </linearGradient>
            </defs>
            <g clipPath={`url(#jarBodyClip-${jar.id})`}>
              <rect
                x="30" y="60" width="140" height="170"
                fill={`url(#waveGrad-${jar.id})`}
                style={{
                  transform: `translateY(${fillLevelTransformY}px)`,
                  transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
              {/* shimmer overlay */}
              {progress > 0 && (
                <rect
                  x="30" y="60" width="30" height="170"
                  fill="white"
                  opacity="0.08"
                  style={{
                    transform: `translateY(${fillLevelTransformY}px)`,
                    transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
              )}
            </g>
            <g fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
              <path d={jarBodyPath} />
              <path d={jarRimPath} />
            </g>
          </svg>
        </div>
        <div className="mt-2 text-center w-full">
          <p className="text-2xl font-bold text-slate-800">
            {formatRupee(saved)} / {formatRupee(goal)}
          </p>
          {/* Colorful progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${percent}%`,
                background: `linear-gradient(to right, ${jarColors.fill}, ${jarColors.wave})`,
              }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-1">{percent}% of goal reached</p>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        {/* Set Goal */}
        <div>
          <label className="text-sm font-medium text-slate-600">Update Goal</label>
          <div className="flex flex-wrap gap-2 mt-1">
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="flex-1 min-w-0 border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto text-sm"
              placeholder={`Current: ${formatRupee(goal)}`}
            />
            <Button onClick={handleSetGoal} variant="outline" className="w-full sm:w-auto">Set Goal</Button>
          </div>
        </div>

        {/* Add Money */}
        <div>
          <label className="text-sm font-medium text-slate-600">Add to Jar</label>
          <div className="flex flex-wrap gap-2 mt-1">
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 min-w-0 border rounded-lg p-2 focus:ring-green-500 focus:border-green-500 w-full sm:w-auto text-sm"
              placeholder="Enter amount"
            />
            <Button onClick={handleAddClick} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">+ Add</Button>
          </div>
          <div className="flex gap-2 mt-2">
            {[500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => addDeposit(amt)}
                className="px-3 py-1 text-xs rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium border border-emerald-100 transition-colors"
              >
                +{formatRupee(amt)}
              </button>
            ))}
          </div>
        </div>

        {/* Withdraw Money */}
        <div>
          <label className="text-sm font-medium text-slate-600">Withdraw from Jar</label>
          <div className="flex flex-wrap gap-2 mt-1">
            <input
              type="number"
              value={withdrawInput}
              onChange={(e) => setWithdrawInput(e.target.value)}
              className="flex-1 min-w-0 border rounded-lg p-2 focus:ring-red-400 focus:border-red-400 w-full sm:w-auto text-sm"
              placeholder={`Max: ${formatRupee(saved)}`}
            />
            <Button onClick={handleWithdrawClick} variant="destructive" className="w-full sm:w-auto">Withdraw</Button>
          </div>
        </div>
        {/* History */}
        <div>
          <h3 className="font-semibold text-center border-t pt-4 text-slate-700">Transaction History</h3>
          <ul className="text-sm space-y-1 mt-2 max-h-40 overflow-y-auto pr-2">
            {history.length > 0 ? (
              history.map((h) => (
                <li key={h.id} className={`flex justify-between p-2 rounded-lg ${h.amount < 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                  <span className={`font-medium ${h.amount < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {h.amount < 0 ? "−" : "+"}{formatRupee(Math.abs(h.amount))}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-gray-400 text-center p-4">No transactions yet.</li>
            )}
          </ul>
        </div>
        <div className="pt-4 border-t flex justify-center">
          <Button onClick={() => onDelete(jar.id)} variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600 text-sm">
            🗑 Delete this Jar
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- New Parent Manager Component ---
export default function SavingsJarsManager() {
  const [jars, setJars] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJars() {
      try {
        const res = await fetch("/api/savings");
        if (!res.ok) throw new Error("Failed to fetch savings jars");
        const data = await res.json();
        setJars(data);
        if (!data.length) setIsModalOpen(true);
      } catch (e) {
        setError(e.message);
        setIsModalOpen(true);
      } finally {
        setLoading(false);
      }
    }
    fetchJars();
  }, []);

  const handleAddJar = async ({ name, goal }) => {
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetAmount: goal }),
      });
      if (!res.ok) throw new Error("Failed to create jar");
      const newJar = await res.json();
      setJars((currentJars) => [...currentJars, newJar]);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateJar = async (updatedJar) => {
    try {
      const patchBody = {};
      if (updatedJar.name !== undefined) patchBody.name = updatedJar.name;
      if (updatedJar.goal !== undefined) patchBody.targetAmount = updatedJar.goal;
      if (updatedJar.notes !== undefined) patchBody.notes = updatedJar.notes || null;
      if (typeof updatedJar.depositDelta === "number") {
        patchBody.depositDelta = updatedJar.depositDelta;
      }
      const res = await fetch(`/api/savings/${updatedJar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) throw new Error("Failed to update jar");
      // Use the full jar returned from server (includes updated recentDeposits)
      const jar = await res.json();
      setJars((currentJars) =>
        currentJars.map((j) => (j.id === jar.id ? jar : j))
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteJar = async (jarId) => {
    if (!window.confirm("Are you sure you want to delete this savings jar?"))
      return;
    try {
      const res = await fetch(`/api/savings/${jarId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete jar");
      setJars((currentJars) => currentJars.filter((j) => j.id !== jarId));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="p-8">Loading savings jars...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 px-6 py-10 md:px-10 mb-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-1">Savings</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">My Savings Jars 🫙</h1>
          <p className="text-slate-400 text-sm">Set goals, track progress, and build your financial future.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 space-y-8">
        <AnimatePresence>
          {isModalOpen && (
            <JarSetupModal
              onSave={handleAddJar}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </AnimatePresence>

        <header className="flex justify-between items-center">
          <div />
          {jars.length > 0 && (
            <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">+ Add New Jar</Button>
          )}
        </header>

        {jars.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {jars.map((jar) => (
              <SavingsJar
                key={jar.id}
                jar={{ ...jar, goal: Number(jar.targetAmount), saved: Number(jar.currentAmount) }}
                onUpdate={handleUpdateJar}
                onDelete={handleDeleteJar}
              />
            ))}
          </div>
        ) : (
          !isModalOpen && (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">🫙</div>
              <p className="text-slate-500 text-lg font-medium mb-2">No savings jars yet</p>
              <p className="text-slate-400 text-sm mb-8">Create your first jar and start saving towards a goal.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                Create Your First Jar
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
