"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X, Sparkles, Brain, TrendingUp, Wallet, ShieldCheck, Loader2 } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBudget, getBudgetRecommendation } from "@/actions/budget";

export function BudgetProgress({ initialBudget, currentExpenses }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(
    initialBudget?.amount?.toString() || ""
  );
  const [showAIRecommendation, setShowAIRecommendation] = useState(false);

  const {
    loading: isLoading,
    fn: updateBudgetFn,
    data: updatedBudget,
    error,
  } = useFetch(updateBudget);

  const {
    loading: isAILoading,
    fn: getAIRecommendationFn,
    data: aiRecommendationData,
  } = useFetch(getBudgetRecommendation);

  const percentUsed = initialBudget
    ? (currentExpenses / initialBudget.amount) * 100
    : 0;

  const handleUpdateBudget = async () => {
    const amount = parseFloat(newBudget);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    await updateBudgetFn(amount);
  };

  const handleCancel = () => {
    setNewBudget(initialBudget?.amount?.toString() || "");
    setIsEditing(false);
  };

  useEffect(() => {
    if (updatedBudget?.success) {
      setIsEditing(false);
      setShowAIRecommendation(false);
      toast.success("Budget updated successfully");
    }
  }, [updatedBudget]);

  const handleApplyAISuggestion = async () => {
    if (aiRecommendationData?.recommendation?.suggestedAmount) {
      await updateBudgetFn(aiRecommendationData.recommendation.suggestedAmount);
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update budget");
    }
  }, [error]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-sm font-medium">
              Monthly Budget (Default Account)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={() => {
                setShowAIRecommendation(!showAIRecommendation);
                if (!aiRecommendationData) getAIRecommendationFn();
              }}
              disabled={isAILoading}
            >
              {isAILoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Suggest
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-32"
                  placeholder="Enter amount"
                  autoFocus
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUpdateBudget}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <>
                <CardDescription>
                  {initialBudget
                    ? `₹${currentExpenses.toFixed(
                      2
                    )} of ₹${initialBudget.amount.toFixed(2)} spent`
                    : "No budget set"}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {initialBudget && (
          <div className="space-y-2">
            <Progress
              value={percentUsed}
              extraStyles={`${percentUsed >= 90
                ? "bg-red-500"
                : percentUsed >= 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
                }`}
            />
            <p className="text-xs text-muted-foreground text-right">
              {percentUsed.toFixed(1)}% used
            </p>
          </div>
        )}

        {showAIRecommendation && aiRecommendationData?.recommendation && (
          <div className="mt-4 p-4 rounded-lg bg-indigo-50 border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-100 p-2 rounded-full mt-1">
                <Brain className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-semibold text-indigo-900 text-sm">
                    AI Budget Recommendation
                  </h4>
                  <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                    {aiRecommendationData.recommendation.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-2 rounded border border-indigo-100">
                    <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
                      <ShieldCheck className="h-3 w-3" /> FIXED
                    </div>
                    <div className="text-sm font-bold text-indigo-900">
                      ₹{aiRecommendationData.recommendation.breakdown.fixedCosts.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-indigo-100">
                    <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
                      <TrendingUp className="h-3 w-3" /> SAVINGS
                    </div>
                    <div className="text-sm font-bold text-indigo-900">
                      ₹{aiRecommendationData.recommendation.breakdown.savings.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-indigo-100">
                    <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
                      <Wallet className="h-3 w-3" /> SPEND
                    </div>
                    <div className="text-sm font-bold text-indigo-900">
                      ₹{aiRecommendationData.recommendation.breakdown.discretionary.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                  <div>
                    <span className="text-xs text-indigo-600">Suggested: </span>
                    <span className="text-base font-bold text-indigo-900">
                      ₹{aiRecommendationData.recommendation.suggestedAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-indigo-600 hover:bg-white"
                      onClick={() => setShowAIRecommendation(false)}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      onClick={handleApplyAISuggestion}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      Apply Budget
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}