import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const [fds, ppfs, bonds, realEstates, golds] = await Promise.all([
      db.fixedDeposit.findMany({ where: { userId: user.id } }),
      db.pPF.findMany({ where: { userId: user.id } }),
      db.bondDetail.findMany({ where: { userId: user.id } }),
      db.realEstate.findMany({ where: { userId: user.id } }),
      db.gold.findMany({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ fds, ppfs, bonds, realEstates, golds });
  } catch (error) {
    console.error("[PORTFOLIO_ASSETS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
