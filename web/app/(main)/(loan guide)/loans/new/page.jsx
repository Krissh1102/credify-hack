"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { createLoanSchema } from "@/lib/schemas";
import { createLoan } from "@/actions/loanActions";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function AddLoanForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(createLoanSchema),
    defaultValues: {
      name: "",
      lender: "",
      type: "PERSONAL",
      principalAmount: 0,
      outstandingBalance: 0,
      interestRate: 0,
      tenureInMonths: 0,
      emiAmount: 0,
      startDate: new Date(),
    },
  });

  const calculateEMI = () => {
    const principalAmount = parseFloat(form.getValues("principalAmount"));
    const interestRate = parseFloat(form.getValues("interestRate"));
    const tenureInMonths = parseInt(form.getValues("tenureInMonths"), 10);

    if (isNaN(principalAmount) || isNaN(interestRate) || isNaN(tenureInMonths)) {
        toast.error(
            "Please fill in Principal Amount, Interest Rate, and Tenure first"
        );
        return;
    }

    // Updated validation: principal and tenure must be positive, interest rate can be 0 or more.
    if (principalAmount <= 0 || interestRate < 0 || tenureInMonths <= 0) {
      toast.error(
        "Principal and Tenure must be greater than 0. Interest rate cannot be negative."
      );
      return;
    }

    let emi;
    // Handle 0% interest rate case to avoid division by zero
    if (interestRate === 0) {
      emi = principalAmount / tenureInMonths;
    } else {
      // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
      // Where P = Principal, r = monthly interest rate, n = number of months
      const monthlyRate = interestRate / 100 / 12; // Convert annual rate to monthly
      emi =
        (principalAmount *
          monthlyRate *
          Math.pow(1 + monthlyRate, tenureInMonths)) /
        (Math.pow(1 + monthlyRate, tenureInMonths) - 1);
    }

    const roundedEMI = Math.round(emi * 100) / 100;

    if (isNaN(roundedEMI) || !isFinite(roundedEMI)) {
      toast.error("Could not calculate EMI. Please check the values entered.");
      return;
    }

    form.setValue("emiAmount", roundedEMI);
    toast.success(`EMI calculated: ₹${roundedEMI.toLocaleString()}`);
  };

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const result = await createLoan(values);
      if (result?.success === false) {
        toast.error(result.message);
      } else {
        toast.success("Loan added successfully!");
        router.push("/loans");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Name (e.g., My Car Loan)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter a name for your loan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lender (e.g., HDFC Bank)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter the lender's name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a loan type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="HOME">Home Loan</SelectItem>
                    <SelectItem value="AUTO">Auto Loan</SelectItem>
                    <SelectItem value="PERSONAL">Personal Loan</SelectItem>
                    <SelectItem value="EDUCATION">Education Loan</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="principalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Principal Amount (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 500000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="outstandingBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Outstanding Balance (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter the current balance"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interestRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest Rate (% p.a.)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 8.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tenureInMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Tenure (in Months)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 60 for 5 years"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emiAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly EMI Amount (₹)</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter your EMI amount"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={calculateEMI}
                    title="Calculate EMI"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the calculator icon to auto-calculate EMI based on
                  Principal Amount, Interest Rate, and Tenure
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-2">
                <FormLabel>Loan Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            "Add Loan"
          )}
        </Button>
      </form>
    </Form>
  );
}