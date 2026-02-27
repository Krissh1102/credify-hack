"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ThemeProvider } from "@/components/theme-provider";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Users,
  Wallet,
  Goal,
} from "lucide-react";
import { redirect } from "next/navigation";

export default function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    hasSecondaryIncome: "no",
    secondaryIncomeSources: {},
  });
  const totalSteps = 5;

  const next = () => setStep((s) => Math.min(totalSteps, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecondaryIncomeSourceChange = (source, isChecked) => {
    setFormData((prev) => ({
      ...prev,
      secondaryIncomeSources: {
        ...prev.secondaryIncomeSources,
        [source]: isChecked,
      },
    }));
  };

  // Define the new style object for clean reuse
  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
              {step === 1 && <User className="text-gray-700" />}
              {step === 2 && <Users className="text-gray-700" />}
              {step === 3 && <Wallet className="text-gray-700" />}
              {step === 4 && <Wallet className="text-gray-700" />}
              {step === 5 && <Goal className="text-gray-700" />}
              {step === 1 && "Basic Information"}
              {step === 2 && "Family Details"}
              {step === 3 && "Income Details"}
              {step === 4 && "Expenses & Liabilities"}
              {step === 5 && "Financial Goals"}
            </CardTitle>
            <Progress value={(step / totalSteps) * 100} className="mt-3" />
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div style={fieldStyle}>
                  <Label>Full Name</Label>
                  <Input
                    placeholder="Enter your full name"
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>
                <div style={fieldStyle}>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    placeholder="Enter your age"
                    onChange={(e) => handleChange("age", e.target.value)}
                  />
                </div>
                <div style={fieldStyle}>
                  <Label>Occupation</Label>
                  <Select onValueChange={(v) => handleChange("occupation", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salaried</SelectItem>
                      <SelectItem value="self-employed">
                        Self-employed
                      </SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="homemaker">Homemaker</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Family Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div style={fieldStyle}>
                  <Label>Marital Status</Label>
                  <RadioGroup
                    onValueChange={(v) => handleChange("maritalStatus", v)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="single" />
                      <Label htmlFor="single">Single</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="married" id="married" />
                      <Label htmlFor="married">Married</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="divorced" id="divorced" />
                      <Label htmlFor="divorced">Divorced</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div style={fieldStyle}>
                  <Label>Number of Dependents</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2"
                    onChange={(e) => handleChange("dependents", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Income Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div style={fieldStyle}>
                  <Label>Average Monthly Income (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 30000"
                    onChange={(e) => handleChange("income", e.target.value)}
                  />
                </div>
                <div style={fieldStyle}>
                  <Label>Do you have secondary income sources?</Label>
                  <RadioGroup
                    defaultValue="no"
                    onValueChange={(v) =>
                      handleChange("hasSecondaryIncome", v)
                    }
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="sec-yes" />
                      <Label htmlFor="sec-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="sec-no" />
                      <Label htmlFor="sec-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                {formData.hasSecondaryIncome === "yes" && (
                  <div style={fieldStyle}>
                    <Label>What are your secondary income sources?</Label>
                    <div className="mt-2 space-y-2">
                      {[
                        "Freelancing",
                        "Rental Income",
                        "Investments",
                        "Other",
                      ].map((source) => (
                        <div
                          key={source}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={source}
                            onCheckedChange={(checked) =>
                              handleSecondaryIncomeSourceChange(
                                source,
                                checked
                              )
                            }
                          />
                          <Label htmlFor={source}>{source}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={fieldStyle}>
                  <Label>Income Type</Label>
                  <RadioGroup
                    onValueChange={(v) => handleChange("incomeType", v)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed">Fixed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="variable" id="variable" />
                      <Label htmlFor="variable">Variable</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Step 4: Expenses */}
            {step === 4 && (
              <div className="space-y-4">
                <div style={fieldStyle}>
                  <Label>Monthly Household Expenses (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 20000"
                    onChange={(e) => handleChange("expenses", e.target.value)}
                  />
                </div>
                <div style={fieldStyle}>
                  <Label>Do you have any loans or EMIs?</Label>
                  <RadioGroup
                    onValueChange={(v) => handleChange("loan", v)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes" />
                      <Label htmlFor="yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no" />
                      <Label htmlFor="no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Step 5: Financial Goals */}
            {step === 5 && (
              <div style={fieldStyle} className="space-y-3">
                <Label>Main Financial Goals</Label>
                <div className="flex flex-col space-y-2">
                  {[
                    "Build Savings",
                    "Buy a Home",
                    "Education",
                    "Retirement",
                    "Pay off Loans",
                    "Emergency Fund",
                  ].map((goal) => (
                    <div
                      key={goal}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        onCheckedChange={(v) => handleChange(goal, v)}
                      />
                      <Label>{goal}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              {step > 1 ? (
                <Button variant="outline" onClick={back}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div />
              )}
              {step < totalSteps ? (
                <Button onClick={next}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={(redirect("/dashboard"))}
                >
                  Submit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
}