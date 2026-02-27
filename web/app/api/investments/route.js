// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";

// export async function GET(req) {
//   const user = await auth();
//   if (!user) return new Response("Unauthorized", { status: 401 });

//   const investments = await db.investment.findMany({
//     where: { userId: user.id },
//     orderBy: { date: "desc" },
//   });
//   return Response.json(investments);
// }

// export async function POST(req) {
//   const user = await auth();
//   if (!user) return new Response("Unauthorized", { status: 401 });
//   const data = await req.json();
//   const investment = await db.investment.create({
//     data: {
//       ...data,
//       userId: user.id,
//     },
//   });
//   return Response.json(investment);
// }

// // ./app/api/investments/route.js

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET handler to fetch investments
export async function GET(req) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    // Find internal user UUID using Clerk user ID
    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }
    const investments = await db.investment.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(investments);
  } catch (error) {
    console.error("[INVESTMENTS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// POST handler to create a new investment
export async function POST(req) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the internal user UUID using the Clerk user ID
    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const body = await req.json();
    const { name, type, amount, date, notes } = body;

    // Server-side validation
    if (!name || !type || !amount || !date) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const investment = await db.investment.create({
      data: {
        userId: user.id, // Use internal UUID
        name,
        type,
        amount,
        date: new Date(date),
        notes,
      },
    });

    return NextResponse.json(investment, { status: 201 });
  } catch (error) {
    console.error("[INVESTMENTS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
