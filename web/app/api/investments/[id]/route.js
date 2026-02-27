import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";


export async function PATCH(req, { params }) {
  const user = await auth();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = params;
  const data = await req.json();
  const investment = await db.investment.update({
    where: { id, userId: user.id },
    data,
  });
  return Response.json(investment);
}

export async function DELETE(req, { params }) {
  const user = await auth();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = params;
  await db.investment.delete({
    where: { id, userId: user.id },
  });
  return new Response(null, { status: 204 });
}
