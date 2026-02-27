"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { checkUser } from "@/lib/checkUser";

const serialize = (obj) => {
    if (obj === null || obj === undefined) return obj;
    const s = { ...obj };
    Object.keys(s).forEach((k) => {
        if (s[k] && typeof s[k].toNumber === "function") {
            s[k] = s[k].toNumber();
        }
    });
    return s;
};

export async function getFinancialContext() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    const uid = user.id;

    // Fetch 90 days of transactions
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);

    const [
        transactions,
        loans,
        investments,
        savingsJars,
        budgets,
        ppfs,
        fixedDeposits,
        bonds,
        realEstates,
        golds,
        accounts,
    ] = await Promise.all([
        db.transaction.findMany({
            where: { userId: uid, date: { gte: since90 } },
            orderBy: { date: "desc" },
            select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                date: true,
                category: true,
                isRecurring: true,
                recurringInterval: true,
                status: true,
            },
        }),
        db.loan.findMany({
            where: { userId: uid },
            select: {
                id: true,
                name: true,
                lender: true,
                type: true,
                principalAmount: true,
                outstandingBalance: true,
                interestRate: true,
                tenureInMonths: true,
                emiAmount: true,
                issueDate: true,
                nextPaymentDate: true,
                status: true,
            },
        }),
        db.investment.findMany({
            where: { userId: uid },
            select: { id: true, name: true, type: true, amount: true, date: true, notes: true },
        }),
        db.savingsJar.findMany({
            where: { userId: uid },
            select: { id: true, name: true, targetAmount: true, currentAmount: true, goalDate: true },
        }),
        db.budget.findFirst({
            where: { userId: uid },
            select: { amount: true },
        }),
        db.pPF.findMany({
            where: { userId: uid },
            select: { balance: true, asOf: true },
        }),
        db.fixedDeposit.findMany({
            where: { userId: uid },
            select: { bank: true, principal: true, rate: true, maturityDate: true },
        }),
        db.bondDetail.findMany({
            where: { userId: uid },
            select: { name: true, units: true, invested: true, currentValue: true, maturityDate: true },
        }),
        db.realEstate.findMany({
            where: { userId: uid },
            select: { desc: true, purchasePrice: true, currentValue: true },
        }),
        db.gold.findMany({
            where: { userId: uid },
            select: { desc: true, purchasePrice: true, currentValue: true },
        }),
        db.account.findMany({
            where: { userId: uid },
            select: { name: true, type: true, balance: true, isDefault: true },
        }),
    ]);

    return {
        transactions: transactions.map(serialize),
        loans: loans.map(serialize),
        investments: investments.map(serialize),
        savingsJars: savingsJars.map(serialize),
        budget: budgets ? serialize(budgets) : null,
        ppfs: ppfs.map(serialize),
        fixedDeposits: fixedDeposits.map(serialize),
        bonds: bonds.map(serialize),
        realEstates: realEstates.map(serialize),
        golds: golds.map(serialize),
        accounts: accounts.map(serialize),
    };
}
