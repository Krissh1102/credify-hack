"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { addMonths, format } from "date-fns";

import { createLoanSchema } from "@/lib/schemas";
import { checkUser } from "@/lib/checkUser"; // Your utility to get the internal user from Clerk ID
import { db } from "@/lib/prisma";

/**
 * Creates a new loan for the authenticated user.
 * Validates form data, calculates the first payment date, and saves to the database.
 * @param {FormData | object} formData - The loan data from the form.
 * @returns {Promise<{success: boolean, message: string}>} - A result object.
 */
export async function createLoan(formData) {
  const formValues =
    formData instanceof FormData
      ? Object.fromEntries(formData.entries())
      : formData;

  const validatedFields = createLoanSchema.safeParse(formValues);

  if (!validatedFields.success) {
    console.error(
      "Validation Errors:",
      validatedFields.error.flatten().fieldErrors
    );
    return { success: false, message: "Error: Invalid form data provided." };
  }

  try {
    const user = await checkUser();
    if (!user) {
      return { success: false, message: "Error: User not found in database." };
    }

    const { data } = validatedFields;

    const nextPaymentDate = addMonths(data.startDate, 1);

    await db.loan.create({
      data: {
        userId: user.id,
        name: data.name,
        lender: data.lender,
        type: data.type,
        principalAmount: data.principalAmount,
        outstandingBalance: data.outstandingBalance,
        interestRate: data.interestRate,
        tenureInMonths: data.tenureInMonths,
        emiAmount: data.emiAmount,
        issueDate: data.startDate,
        nextPaymentDate: nextPaymentDate,
      },
    });
  } catch (error) {
    console.error("Failed to create loan:", error);
    return {
      success: false,
      message: "Database Error: Failed to create the loan.",
    };
  }

  revalidatePath("/loans");

  return { success: true, message: "Loan added successfully!" };
}

/**
 * Fetches all loans for the currently authenticated user.
 * Formats the data to be safe and usable by client components.
 * @returns {Promise<Array<object>>} - An array of formatted loan objects.
 */
export async function getLoans() {
  const user = await currentUser();
  if (!user) {
    return [];
  }

  const loansFromDb = await db.loan.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      issueDate: "desc",
    },
  });

  return loansFromDb.map((loan) => {
    const nextPaymentDate = loan.nextPaymentDate
      ? format(loan.nextPaymentDate, "yyyy-MM-dd")
      : format(addMonths(loan.issueDate, 1), "yyyy-MM-dd");

    return {
      id: loan.id,
      name: loan.name,
      type: loan.type,
      outstanding: Number(loan.outstandingBalance),
      principal: Number(loan.principalAmount),
      interestRate: Number(loan.interestRate),
      nextPaymentAmount: Number(loan.emiAmount),
      status: loan.status,
      nextPaymentDate: loan.status === "PAID_OFF" ? "N/A" : nextPaymentDate,
    };
  });
}
export async function getLoanOverviewData() {
  const user = await checkUser();
  if (!user) {
    return {
      summary: {
        totalOutstanding: 0,
        totalPrincipal: 0,
        totalPaid: 0,
        activeLoanCount: 0,
        averageInterestRate: 0,
        nextPayment: null,
      },
      loans: [],
    };
  }

  const loansFromDb = await db.loan.findMany({
    where: { userId: user.id },
    orderBy: { issueDate: "asc" },
  });

  if (loansFromDb.length === 0) {
    return {
      summary: {
        totalOutstanding: 0,
        totalPrincipal: 0,
        totalPaid: 0,
        activeLoanCount: 0,
        averageInterestRate: 0,
        nextPayment: null,
      },
      loans: [],
    };
  }

  const activeLoans = loansFromDb.filter((loan) => loan.status === "ACTIVE");

  const totalOutstanding = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.outstandingBalance),
    0
  );

  const totalPrincipal = loansFromDb.reduce(
    (sum, loan) => sum + Number(loan.principalAmount),
    0
  );

  const totalPaid = totalPrincipal - totalOutstanding;

  const totalInterestRate = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.interestRate),
    0
  );

  const averageInterestRate =
    activeLoans.length > 0 ? totalInterestRate / activeLoans.length : 0;

  const nextPayment = activeLoans
    .filter((loan) => loan.nextPaymentDate) // Ensure date exists
    .sort(
      (a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate)
    )[0];

  const formattedLoans = loansFromDb.map((loan) => ({
    id: loan.id,
    name: loan.name,
    type: loan.type,
    status: loan.status,
    outstanding: Number(loan.outstandingBalance),
    principal: Number(loan.principalAmount),
    interestRate: Number(loan.interestRate),
    nextPaymentAmount: Number(loan.emiAmount),
    nextPaymentDate: loan.nextPaymentDate
      ? loan.nextPaymentDate.toISOString()
      : null,
  }));

  return {
    summary: {
      totalOutstanding,
      totalPrincipal,
      totalPaid,
      activeLoanCount: activeLoans.length,
      averageInterestRate,
      nextPayment: nextPayment
        ? {
          amount: Number(nextPayment.emiAmount),
          date: nextPayment.nextPaymentDate.toISOString(),
        }
        : null,
    },
    loans: formattedLoans,
  };
}