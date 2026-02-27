// ./app/add-investment/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Using Shadcn/ui components for a consistent look
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddInvestmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    type: "STOCKS",
    amount: "",
    date: new Date().toISOString().slice(0, 10), // Default to today
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Handles changes for all input fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handles change for the Select component
  const handleSelectChange = (value) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  // Handles form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Basic validation
    if (!formData.name || !formData.amount || !formData.date) {
      setError("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount), // Ensure amount is a number
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add investment. Please try again.");
      }

      // On success, redirect to the dashboard or another relevant page
      router.push("/investment-overview");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Investment</CardTitle>
          <CardDescription>
            Enter the details of your new investment below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Investment Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Reliance Industries"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Investment Type</Label>
              <Select
                onValueChange={handleSelectChange}
                defaultValue={formData.type}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCKS">Stocks</SelectItem>
                  <SelectItem value="MUTUAL_FUNDS">Mutual Funds</SelectItem>
                  <SelectItem value="BONDS">Bonds</SelectItem>
                  <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                  <SelectItem value="CRYPTO">Crypto</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="e.g., 50000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Investment Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="e.g., SIP due on the 5th"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Adding Investment..." : "Add Investment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
