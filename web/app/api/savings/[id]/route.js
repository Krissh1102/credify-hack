import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";

export async function PATCH(req, { params }) {
  const user = await checkUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const data = await req.json();

  // Build the update payload
  let updateData = {};

  // Update name / targetAmount / notes if provided
  if (data.name !== undefined) updateData.name = data.name;
  if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // Handle balance change via depositDelta (positive = deposit, negative = withdraw)
  if (typeof data.depositDelta === "number") {
    const existing = await db.savingsJar.findUnique({
      where: { id, userId: user.id },
    });
    if (existing) {
      const newAmount = Math.max(0, Number(existing.currentAmount) + data.depositDelta);
      updateData.currentAmount = newAmount;

      // Prepend the new transaction entry and keep only the last 20
      const existingHistory = Array.isArray(existing.recentDeposits)
        ? existing.recentDeposits
        : [];
      const newEntry = {
        id: Date.now(),
        amount: data.depositDelta,
        date: new Date().toISOString(),
      };
      updateData.recentDeposits = [newEntry, ...existingHistory].slice(0, 20);
    }
  }

  const jar = await db.savingsJar.update({
    where: { id, userId: user.id },
    data: updateData,
  });
  return Response.json(jar);
}

export async function DELETE(req, { params }) {
  const user = await checkUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  await db.savingsJar.delete({
    where: { id, userId: user.id },
  });
  return new Response(null, { status: 204 });
}
