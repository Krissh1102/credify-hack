import { z } from "zod";

export const createLoanSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Loan name must be at least 3 characters long." }),
  lender: z.string().min(2, { message: "Lender name is required." }),
  type: z.enum(["HOME", "AUTO", "PERSONAL", "EDUCATION", "OTHER"]),
  principalAmount: z.coerce
    .number()
    .positive({ message: "Principal must be a positive number." }),
  outstandingBalance: z.coerce
    .number()
    .positive({ message: "Outstanding balance must be a positive number." }),
  interestRate: z.coerce
    .number()
    .positive({ message: "Interest rate must be positive." })
    .max(100),
  tenureInMonths: z.coerce
    .number()
    .int()
    .positive({ message: "Tenure must be a positive number of months." }),
  emiAmount: z.coerce
    .number()
    .positive({ message: "EMI must be a positive number." }),
  startDate: z.date({ required_error: "A start date is required." }),
});
export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["CURRENT", "SAVINGS"]),
  balance: z.string().min(1, "Initial balance is required"),
  isDefault: z.boolean().default(false),
});

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    date: z.date({ required_error: "Date is required" }),
    accountId: z.string().min(1, "Account is required"),
    category: z.string().min(1, "Category is required"),
    isRecurring: z.boolean().default(false),
    recurringInterval: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring interval is required for recurring transactions",
        path: ["recurringInterval"],
      });
    }
  });
