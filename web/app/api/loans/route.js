// app/api/loans/route.js

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log("[LOANS_GET] clerkUserId:", clerkUserId);
    const user = await db.user.findUnique({ where: { clerkUserId } });
    console.log(
      "[LOANS_GET] db user lookup result:",
      user ? { id: user.id, clerkUserId: user.clerkUserId } : null
    );

    if (!user) {
      // Provide a more actionable message during development
      return new NextResponse(
        `User not found for clerkUserId: ${clerkUserId}`,
        { status: 404 }
      );
    }

    const loans = await db.loan.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error("[LOANS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
