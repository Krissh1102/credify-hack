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
  // const [drops, setDrops] = useState([]); // Removed drops state

  // Calculations are now derived from the 'jar' prop
  // Use jar.history if available, otherwise fallback to empty array
  const { goal, saved } = jar;
  const history =
    Array.isArray(jar.history) && jar.history.length > 0
      ? jar.history
      : jar.recentDeposits || [];
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
  const baseFillSvgY = 230;
  // Removed coin related SVG/container height constants

  const fillLevelTransformY = useMemo(
    () => fillableSvgHeight * (1 - progress),
    [progress]
  );
  // Removed coinLandingY memoization

  function formatRupee(v) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);
  }

  // Functions now call 'onUpdate' prop instead of setting local state
  function addDeposit(amount) {
    if (!amount || amount <= 0) return;
    const entry = { id: Date.now(), amount, date: new Date().toISOString() };
    const newHistory = [entry, ...history].slice(0, 20);
    // Only send the delta to backend, not the total
    onUpdate({
      ...jar,
      saved: saved,
      depositDelta: amount,
      history: newHistory,
    });

    // Removed coin animation related logic
    // const newDrops = Array.from({ length: Math.min(5, Math.ceil(amount / 50)) }).map((_, i) => ({
    //   id: `${Date.now()}-${i}`,
    //   delay: Math.random() * 0.4,
    //   left: 25 + Math.random() * 50,
    //   scale: 0.7 + Math.random() * 0.6,
    // }));
    // setDrops((d) => [...d, ...newDrops]);
  }

  function handleAddClick() {
    const amt = parseFloat(input.replace(/[^0-9.]/g, ""));
    if (!amt || amt <= 0) return;
    addDeposit(amt);
    setInput("");
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

  return (
    <div className="border shadow-lg rounded-2xl p-6 flex flex-col md:flex-row gap-6 font-sans w-full">
      <div className="flex-1 flex flex-col items-center">
        <h3 className="text-xl font-bold  mb-2">{jar.name}</h3>
        <div className="relative w-56 h-72">
          <svg viewBox="0 0 200 260" className="w-full h-full">
            <defs>
              <clipPath id={`jarBodyClip-${jar.id}`}>
                <path d={jarBodyPath} />
              </clipPath>
            </defs>
            <g clipPath={`url(#jarBodyClip-${jar.id})`}>
              <rect
                x="30"
                y="60"
                width="140"
                height="170"
                fill="#34d399"
                style={{
                  transform: `translateY(${fillLevelTransformY}px)`,
                  transition: "transform 0.5s ease-out",
                }}
              />
            </g>
            <g
              fill="none"
              stroke="#6b7280"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <path d={jarBodyPath} />
              <path d={jarRimPath} />
            </g>
          </svg>
          {/* Removed coin animation rendering */}
          {/* {drops.map((coin) => (
              <motion.div key={coin.id} initial={{ y: -50, opacity: 0, scale: coin.scale }} animate={{ y: coinLandingY, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 10, mass: 0.5, delay: coin.delay }}
                className="absolute w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-sm"
                style={{ left: `${coin.left}%` }} />
            ))} */}
        </div>
        <div className="mt-4 text-center">
          <p className="text-2xl font-bold ">
            {formatRupee(saved)} / {formatRupee(goal)}
          </p>
          <p className="text-sm ">{percent}% of goal</p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {/* Set Goal (Moved Up) */}
        <div>
          <label className="text-sm font-medium ">Update Goal</label>
          <div className="flex flex-wrap gap-2 mt-1">
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="flex-1 min-w-0 border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
              placeholder={`Current: ${formatRupee(goal)}`}
            />
            <Button
              onClick={handleSetGoal}
              className="x-5 py-2 rounded-lg font-semibold w-full sm:w-auto"
            >
              Set Goal
            </Button>
          </div>
        </div>
        {/* Add Money */}
        <div>
          <label className="text-sm font-medium ">Add to Jar</label>
          <div className="flex flex-wrap gap-2 mt-1">
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 min-w-0 border rounded-lg p-2 focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
              placeholder="Enter amount"
            />
            <Button onClick={handleAddClick} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            {[50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => addDeposit(amt)}
                className="px-3 py-1 text-sm rounded-lg hover:bg-gray-300"
              >
                +{formatRupee(amt)}
              </button>
            ))}
          </div>
        </div>
        {/* History */}
        <div>
          <h3 className="font-semibold text-center border-t pt-4">
            Recent Deposits
          </h3>
          <ul className="text-sm space-y-1 mt-2 max-h-40 overflow-y-auto pr-2">
            {history.length > 0 ? (
              history.map((h) => (
                <li key={h.id} className="flex justify-between p-1 rounded">
                  <span className="font-medium ">{formatRupee(h.amount)}</span>
                  <span className="text-gray-500">
                    {new Date(h.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-gray-500 text-center p-4">
                No deposits yet.
              </li>
            )}
          </ul>
        </div>
        <div className="pt-4 border-t flex justify-center">
          <Button onClick={() => onDelete(jar.id)} variant="destructive">
            Delete this Jar
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
      // If depositDelta is present, send only the delta to backend
      const patchBody = {
        name: updatedJar.name,
        targetAmount: updatedJar.goal,
        notes: updatedJar.notes || null,
      };
      if (typeof updatedJar.depositDelta === "number") {
        patchBody.depositDelta = updatedJar.depositDelta;
      }
      const res = await fetch(`/api/savings/${updatedJar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) throw new Error("Failed to update jar");
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
        <h1 className="text-3xl font-bold ">My Savings Jars</h1>
        {jars.length > 0 && (
          <Button onClick={() => setIsModalOpen(true)}>+ Add New Jar</Button>
        )}
      </header>

      {jars.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {jars.map((jar) => (
            <SavingsJar
              key={jar.id}
              jar={{
                ...jar,
                goal: jar.targetAmount,
                saved: jar.currentAmount,
                // Try to use jar.recentDeposits if available, else empty array
                history: jar.recentDeposits || [],
              }}
              onUpdate={handleUpdateJar}
              onDelete={handleDeleteJar}
            />
          ))}
        </div>
      ) : (
        !isModalOpen && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">
              You don't have any savings jars yet.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-500 text-white font-semibold px-5 py-3 rounded-lg hover:bg-green-600"
            >
              Create Your First Jar
            </button>
          </div>
        )
      )}
    </div>
  );
}
