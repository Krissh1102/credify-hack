import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function GET() {
    try {
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { clerkUserId },
            include: {
                transactions: true,
                investments: true,
                fixedDeposits: true,
                ppfs: true,
            },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Determine current Financial Year (e.g. Apr 1 to Mar 31)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyStart = new Date(fyStartYear, 3, 1); // April 1
        const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // March 31

        // 1. Calculate Real Income for the current FY
        const fyIncomes = user.transactions.filter(
            (t) => t.type === "INCOME" && new Date(t.date) >= fyStart && new Date(t.date) <= fyEnd
        );
        const realIncome = fyIncomes.reduce((sum, t) => sum + Number(t.amount), 0);

        // Fallback if no transactions recorded yet
        const estimatedAnnualIncome = realIncome > 0 ? realIncome : 1200000; // Default 12 LPA for demo

        // 2. Fetch 80C Deductions
        // Fixed Deposits
        const fdInvestments = user.fixedDeposits.reduce((sum, fd) => sum + Number(fd.principal), 0);
        // PPF
        const ppfInvestments = user.ppfs.reduce((sum, p) => sum + Number(p.balance), 0);
        // Mutual Funds (assuming ELSS for simplicity in 80C mapping)
        const mfInvestments = user.investments
            .filter((inv) => inv.type === "MUTUAL_FUNDS")
            .reduce((sum, inv) => sum + Number(inv.amount), 0);

        const total80C = fdInvestments + ppfInvestments + mfInvestments;

        // 3. Tax Calculation (Simplified India FY24-25)
        const calculateOldRegime = (income, deductions80C) => {
            let taxable = income - 50000; // Standard Deduction
            taxable = taxable - Math.min(deductions80C, 150000); // Max 80C is 1.5L
            if (taxable <= 500000) return 0; // Rebate
            let tax = 0;
            if (taxable > 250000) tax += (Math.min(taxable, 500000) - 250000) * 0.05;
            if (taxable > 500000) tax += (Math.min(taxable, 1000000) - 500000) * 0.20;
            if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
            return tax * 1.04; // Cess
        };

        const calculateNewRegime = (income) => {
            let taxable = income - 75000; // Standard Deduction in New Regime FY24-25
            if (taxable <= 700000) return 0; // Rebate under 87A
            let tax = 0;
            if (taxable > 300000) tax += (Math.min(taxable, 700000) - 300000) * 0.05;
            if (taxable > 700000) tax += (Math.min(taxable, 1000000) - 700000) * 0.10;
            if (taxable > 1000000) tax += (Math.min(taxable, 1200000) - 1000000) * 0.15;
            if (taxable > 1200000) tax += (Math.min(taxable, 1500000) - 1200000) * 0.20;
            if (taxable > 1500000) tax += (taxable - 1500000) * 0.30;
            return tax * 1.04; // Cess
        };

        const oldTax = calculateOldRegime(estimatedAnnualIncome, total80C);
        const newTax = calculateNewRegime(estimatedAnnualIncome);

        return NextResponse.json({
            realIncome: estimatedAnnualIncome,
            deductions: {
                section80C: {
                    total: total80C,
                    breakdown: { fd: fdInvestments, ppf: ppfInvestments, mf: mfInvestments },
                },
            },
            taxes: {
                oldRegime: oldTax,
                newRegime: newTax,
                recommended: oldTax < newTax ? "OLD" : "NEW",
                savings: Math.abs(oldTax - newTax),
            },
        });
    } catch (error) {
        console.error("[TAX_DATA_GET]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
