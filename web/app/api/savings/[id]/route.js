import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";

export async function PATCH(req, { params }) {
  const user = await checkUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const data = await req.json();

  // Only increment currentAmount if depositDelta is present
  let updateData = { ...data };
  if (typeof data.depositDelta === "number") {
    const existing = await db.savingsJar.findUnique({
      where: { id, userId: user.id },
    });
    if (existing) {
      updateData.currentAmount =
        Number(existing.currentAmount) + Number(data.depositDelta);
    }
    delete updateData.depositDelta;
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
