"use server";

// import aj from "@/lib/arcjet";
import { db } from "@/lib/prisma";
// import { request } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { checkUser } from "@/lib/checkUser";

const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function getUserAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser();
  if (!user) {
    console.error(
      "[getUserAccounts] User not found - check authentication and DB"
    );
    // Return empty list instead of throwing to avoid crashing the server
    return [];
  }

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    const serializedAccounts = accounts.map(serializeTransaction);

    return serializedAccounts;
  } catch (error) {
    console.error(error.message);
  }
}

export async function createAccount(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) {
      console.error("[createAccount] User not found - cannot create account");
      return { success: false, message: "User not found" };
    }

    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount");
    }

    const existingAccounts = await db.account.findMany({
      where: { userId: user.id },
    });

    const shouldBeDefault =
      existingAccounts.length === 0 ? true : data.isDefault;

    if (shouldBeDefault) {
      await db.account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault,
      },
    });

    const serializedAccount = serializeTransaction(account);

    revalidatePath("/dashboard");
    return { success: true, data: serializedAccount };
  } catch (error) {
    console.error("[createAccount] Error:", error);
    return { success: false, message: error.message || "Unknown error" };
  }
}

export async function getDashboardData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser();
  if (!user) {
    console.error(
      "[getDashboardData] User not found - returning empty transactions"
    );
    return [];
  }

  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return transactions.map(serializeTransaction);
}
