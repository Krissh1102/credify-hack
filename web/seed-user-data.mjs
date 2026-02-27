import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { subDays, eachDayOfInterval } from "date-fns";

const prisma = new PrismaClient();

const CLERK_USER_ID = "user_3AEzM9qmtHizNL3lfJZEy1WNY1Q";
const USER_EMAIL = "vedantkolte18@gmail.com"; // Ensuring a unique email

async function main() {
    console.log("🚀 Starting seeding for user:", CLERK_USER_ID);

    // 1. Get or Create User
    const user = await prisma.user.upsert({
        where: { clerkUserId: CLERK_USER_ID },
        update: {},
        create: {
            clerkUserId: CLERK_USER_ID,
            email: USER_EMAIL,
            name: "Seed User",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=SeedUser",
        },
    });

    console.log(`✅ User identified: ${user.id}`);

    // 2. Create Accounts
    // We'll use upsert with a name-based check or just create if none exist for this user
    let mainSavings = await prisma.account.findFirst({
        where: { userId: user.id, name: "Main Savings" }
    });

    if (!mainSavings) {
        mainSavings = await prisma.account.create({
            data: {
                name: "Main Savings",
                type: "SAVINGS",
                balance: 150000,
                isDefault: true,
                userId: user.id,
            },
        });
    }

    let creditCard = await prisma.account.findFirst({
        where: { userId: user.id, name: "Rewards Credit Card" }
    });

    if (!creditCard) {
        creditCard = await prisma.account.create({
            data: {
                name: "Rewards Credit Card",
                type: "CURRENT",
                balance: -5400,
                userId: user.id,
            },
        });
    }

    console.log("✅ Accounts ready.");

    // 3. Clear existing transactions to allow fresh charting
    console.log("🧹 Cleaning old transactions...");
    await prisma.transaction.deleteMany({
        where: { userId: user.id },
    });

    // 4. Generate Transactions for last 90 days
    console.log("📊 Generating 3 months of transaction data...");
    const transactions = [];
    const now = new Date();
    const startDate = subDays(now, 90);

    const dailyCategories = [
        { id: "food", prob: 0.8, min: 150, max: 800, desc: ["Lunch", "Dinner", "Snacks", "Coffee"] },
        { id: "transportation", prob: 0.6, min: 40, max: 300, desc: ["Uber", "Metro", "Fuel"] },
        { id: "shopping", prob: 0.1, min: 500, max: 5000, desc: ["Amazon", "Fashion Store", "Gadget"] },
        { id: "entertainment", prob: 0.05, min: 1000, max: 3500, desc: ["Movie", "Concert", "Gaming"] },
    ];

    const days = eachDayOfInterval({ start: startDate, end: now });

    for (const day of days) {
        const dayNum = day.getDate();

        // Monthly Salary
        if (dayNum === 1) {
            transactions.push({
                type: "INCOME",
                amount: 125000,
                description: "Monthly Salary Credited",
                date: new Date(day),
                category: "salary",
                userId: user.id,
                accountId: mainSavings.id,
            });
        }

        // Rent
        if (dayNum === 5) {
            transactions.push({
                type: "EXPENSE",
                amount: 35000,
                description: "Monthly Rent Payment",
                date: new Date(day),
                category: "housing",
                userId: user.id,
                accountId: mainSavings.id,
            });
        }

        // Utilities (Internet, Electricity)
        if (dayNum === 10) {
            transactions.push({
                type: "EXPENSE",
                amount: 4500,
                description: "Utility Bills",
                date: new Date(day),
                category: "utilities",
                userId: user.id,
                accountId: mainSavings.id,
            });
        }

        // Groceries (Weekly)
        if (day.getDay() === 0) { // Sunday
            transactions.push({
                type: "EXPENSE",
                amount: Math.floor(Math.random() * 2000) + 1500,
                description: "Weekly Groceries",
                date: new Date(day),
                category: "groceries",
                userId: user.id,
                accountId: mainSavings.id,
            });
        }

        // Daily miscellaneous
        for (const cat of dailyCategories) {
            if (Math.random() < cat.prob) {
                transactions.push({
                    type: "EXPENSE",
                    amount: Math.floor(Math.random() * (cat.max - cat.min + 1) + cat.min),
                    description: cat.desc[Math.floor(Math.random() * cat.desc.length)],
                    date: new Date(day),
                    category: cat.id,
                    userId: user.id,
                    accountId: Math.random() > 0.4 ? mainSavings.id : creditCard.id,
                });
            }
        }
    }

    await prisma.transaction.createMany({
        data: transactions,
    });

    console.log(`✅ ${transactions.length} transactions seeded.`);

    // 5. Loans
    console.log("🏦 Seeding loans...");
    await prisma.loan.deleteMany({ where: { userId: user.id } });

    const hLoan = await prisma.loan.create({
        data: {
            name: "Luxury Apartment Loan",
            lender: "Standard Chartered",
            type: "HOME",
            principalAmount: 7500000,
            outstandingBalance: 6800000,
            interestRate: 8.75,
            tenureInMonths: 240,
            emiAmount: 66000,
            issueDate: subDays(now, 500),
            userId: user.id,
        }
    });

    await prisma.loan.create({
        data: {
            name: "Tesla Car Loan",
            lender: "Tesla Finance",
            type: "AUTO",
            principalAmount: 1200000,
            outstandingBalance: 900000,
            interestRate: 7.5,
            tenureInMonths: 60,
            emiAmount: 24000,
            issueDate: subDays(now, 200),
            userId: user.id,
        }
    });

    // 6. Investments
    console.log("📈 Seeding investments...");
    await prisma.investment.deleteMany({ where: { userId: user.id } });
    await prisma.investment.createMany({
        data: [
            { name: "Global Tech ETF", type: "MUTUAL_FUNDS", amount: 500000, date: subDays(now, 150), userId: user.id },
            { name: "Apple Inc (AAPL)", type: "STOCKS", amount: 250000, date: subDays(now, 300), userId: user.id },
            { name: "Ethereum", type: "CRYPTO", amount: 150000, date: subDays(now, 60), userId: user.id },
        ]
    });

    // 7. Savings Jars
    console.log("🍯 Seeding savings jars...");
    await prisma.savingsJar.deleteMany({ where: { userId: user.id } });
    await prisma.savingsJar.createMany({
        data: [
            { name: "Maldives Dream", targetAmount: 300000, currentAmount: 145000, userId: user.id, goalDate: subDays(now, -180) },
            { name: "New Mac Studio", targetAmount: 250000, currentAmount: 210000, userId: user.id, goalDate: subDays(now, -30) },
            { name: "Emergency Buffer", targetAmount: 1000000, currentAmount: 450000, userId: user.id },
        ]
    });

    // 8. Other Assets
    console.log("💎 Seeding portfolio assets...");
    await prisma.fixedDeposit.deleteMany({ where: { userId: user.id } });
    await prisma.fixedDeposit.create({
        data: { bank: "HDFC", principal: 250000, rate: 7.25, maturityDate: subDays(now, -400), userId: user.id }
    });

    await prisma.gold.deleteMany({ where: { userId: user.id } });
    await prisma.gold.create({
        data: { desc: "Physical Gold", purchasePrice: 400000, currentValue: 485000, userId: user.id }
    });

    console.log("\n✨ Seeding Complete! User is now rich in data.");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
