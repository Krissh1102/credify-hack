import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { z } from "zod";

const updateLoanSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  lender: z.string().min(1, { message: "Lender is required." }),
  type: z.enum(["HOME", "AUTO", "PERSONAL", "EDUCATION", "OTHER"]),
  status: z.enum(["ACTIVE", "PAID_OFF", "DEFAULTED"]),

  principalAmount: z.coerce.number().positive(),
  outstandingBalance: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0),
  tenureInMonths: z.coerce.number().int().positive(),
  emiAmount: z.coerce.number().positive(),

  startDate: z.coerce.date(),
  nextPaymentDate: z.coerce.date().nullable().optional(),
});

export async function GET(req, context) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id: loanId } = await context.params;
    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }
    const loan = await db.loan.findFirst({
      where: { id: loanId, userId: user.id },
      include: { payments: { orderBy: { paymentDate: "desc" } } },
    });
    if (!loan) {
      return new NextResponse("Loan not found", { status: 404 });
    }
    return NextResponse.json(loan);
  } catch (error) {
    console.error("[LOAN_GET_BY_ID]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req, context) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: loanId } = await context.params;
    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const loanToUpdate = await db.loan.findFirst({
      where: { id: loanId, userId: user.id },
    });

    if (!loanToUpdate) {
      return new NextResponse("Loan not found or access denied", {
        status: 404,
      });
    }

    const body = await req.json();

    const validatedData = updateLoanSchema.parse(body);

    const updatedLoan = await db.loan.update({
      where: {
        id: loanId,
      },
      data: validatedData,
    });

    return NextResponse.json(updatedLoan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }

    console.error("[LOAN_PATCH]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}