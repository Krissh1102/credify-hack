import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const formData = await req.formData();

  const message = formData.get("Body") as string;
  const from = formData.get("From") as string;

  console.log("Incoming:", message);

  // 🔹 1. Parse transaction using AI
  const parsed = await parseTransactionWithAI(message);

  if (!parsed) {
    return new NextResponse(
      `<Response><Message>Could not understand transaction ❌</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  // 🔹 2. Find user using WhatsApp number
  const user = await db.user.findFirst({
    where: { whatsappNumber: from },
  });

  if (!user) {
    return new NextResponse(
      `<Response><Message>Number not linked to account ❌</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  // 🔹 3. Save transaction
  await db.transaction.create({
    data: {
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      userId: user.id,
    },
  });

  return new NextResponse(
    `<Response><Message>Transaction added successfully ✅</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

// 🔥 AI Parser Function
async function parseTransactionWithAI(message: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  Extract transaction info from this message:
  "${message}"

  Return JSON:
  {
    "type": "EXPENSE or INCOME",
    "amount": number,
    "category": "string",
    "description": "string"
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "");
    return JSON.parse(text);
  } catch {
    return null;
  }
}