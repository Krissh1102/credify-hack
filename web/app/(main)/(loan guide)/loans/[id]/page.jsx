"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  Home,
  Car,
  Briefcase,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";

// Helper function to get an icon based on loan type
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

// Helper function to format currency to INR
const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);

// Helper function to format date strings
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function LoanDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [loan, setLoan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch loan data when the component mounts or ID changes
  useEffect(() => {
    if (!id) return;

    const fetchLoan = async () => {
      try {
        const response = await fetch(`/api/loans/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch loan: ${response.status}`);
        }
        const data = await response.json();
        setLoan({
          ...data,
          principalAmount: parseFloat(data.principalAmount),
          outstandingBalance: parseFloat(data.outstandingBalance),
          interestRate: parseFloat(data.interestRate),
          emiAmount: parseFloat(data.emiAmount),
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLoan();
  }, [id]);

  // Initialize form state when entering edit mode
  useEffect(() => {
    if (editMode && loan) {
      setForm({
        name: loan.name || "",
        lender: loan.lender || "",
        type: loan.type || "OTHER",
        principalAmount: loan.principalAmount || 0,
        outstandingBalance: loan.outstandingBalance || 0,
        interestRate: loan.interestRate || 0,
        tenureInMonths: loan.tenureInMonths || 0,
        emiAmount: loan.emiAmount || 0,
        issueDate: loan.issueDate ? loan.issueDate.slice(0, 10) : "",
        nextPaymentDate: loan.nextPaymentDate
          ? loan.nextPaymentDate.slice(0, 10)
          : "",
        status: loan.status || "ACTIVE",
      });
    }
  }, [editMode, loan]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
  };

  // Handle form submission to update the loan
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/loans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update loan");
      const updated = await res.json();
      setLoan({
        ...updated,
        principalAmount: parseFloat(updated.principalAmount),
        outstandingBalance: parseFloat(updated.outstandingBalance),
        interestRate: parseFloat(updated.interestRate),
        emiAmount: parseFloat(updated.emiAmount),
      });
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-6">Loading loan details...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!loan) return <div className="p-6">Loan not found.</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Link
        href="/loans"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Loans
      </Link>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                {getLoanIcon(loan.type)}
                <CardTitle>{loan.name}</CardTitle>
                <Badge
                  variant={loan.status === "ACTIVE" ? "default" : "secondary"}
                >
                  {loan.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {loan.lender}
              </p>
            </div>
            {!editMode && (
              <Button variant="outline" onClick={() => setEditMode(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editMode ? (
            form ? (
              <form
                onSubmit={handleFormSubmit}
                className="space-y-4 p-4 rounded-md border"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Form fields... */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Lender
                    </label>
                    <input
                      name="lender"
                      value={form.lender}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="HOME">Home</option>
                      <option value="AUTO">Auto</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="EDUCATION">Education</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Principal Amount
                    </label>
                    <input
                      name="principalAmount"
                      type="number"
                      value={form.principalAmount}
                      onChange={handleFormNumberChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Outstanding Balance
                    </label>
                    <input
                      name="outstandingBalance"
                      type="number"
                      value={form.outstandingBalance}
                      onChange={handleFormNumberChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Interest Rate (%)
                    </label>
                    <input
                      name="interestRate"
                      type="number"
                      step="0.01"
                      value={form.interestRate}
                      onChange={handleFormNumberChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tenure (months)
                    </label>
                    <input
                      name="tenureInMonths"
                      type="number"
                      value={form.tenureInMonths}
                      onChange={handleFormNumberChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Monthly EMI
                    </label>
                    <input
                      name="emiAmount"
                      type="number"
                      value={form.emiAmount}
                      onChange={handleFormNumberChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Issue Date
                    </label>
                    <input
                      name="issueDate"
                      type="date"
                      value={form.issueDate}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Next Payment Date
                    </label>
                    <input
                      name="nextPaymentDate"
                      type="date"
                      value={form.nextPaymentDate}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PAID_OFF">Paid Off</option>
                      <option value="DEFAULTED">Defaulted</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditMode(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
                {error && (
                  <div className="text-red-500 text-sm mt-2">{error}</div>
                )}
              </form>
            ) : (
              <div className="p-4">Loading form...</div>
            )
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Principal Amount
                  </div>
                  <div className="font-mono text-lg">
                    {formatCurrency(loan.principalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Outstanding Balance
                  </div>
                  <div className="font-mono text-lg text-red-600">
                    {formatCurrency(loan.outstandingBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Interest Rate
                  </div>
                  <div className="font-mono text-lg">{loan.interestRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Monthly EMI
                  </div>
                  <div className="font-mono text-lg">
                    {formatCurrency(loan.emiAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Next Payment Date
                  </div>
                  <div className="font-mono">
                    {formatDate(loan.nextPaymentDate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tenure</div>
                  <div className="font-mono">{loan.tenureInMonths} months</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Issue Date
                  </div>
                  <div className="font-mono">{formatDate(loan.issueDate)}</div>
                </div>
              </div>

              {/* Payment History Section */}
              <div className="pt-4">
                <h3 className="font-semibold mb-2">Payment History</h3>
                {loan.payments && loan.payments.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Amount
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loan.payments.map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="px-4 py-2">
                              {formatDate(p.paymentDate)}
                            </td>
                            <td className="px-4 py-2">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {p.notes || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm border rounded-lg p-4 text-center">
                    No payments have been recorded yet.
                  </div>
                )}
              </div>

              {/* AI Insights Section */}
              <div className="pt-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <span role="img" aria-label="AI">
                    🤖
                  </span>{" "}
                  AI Insights
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
                  {loan.status === "ACTIVE" && loan.outstandingBalance > 0 ? (
                    <>
                      <div>
                        <strong>Tip:</strong> Paying a little extra each month
                        can reduce your total interest paid and help you close
                        this loan faster.
                      </div>
                      <div>
                        <strong>Projection:</strong> At your current EMI, this
                        loan will be paid off in approximately{" "}
                        {loan.tenureInMonths} months. Consider prepaying if
                        possible.
                      </div>
                    </>
                  ) : (
                    <div>
                      Congratulations on paying off this loan! 🎉 Keep up the
                      great financial habits.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
