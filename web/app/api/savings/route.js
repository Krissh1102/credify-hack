import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";

export async function GET(req) {
  const user = await checkUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const jars = await db.savingsJar.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(jars);
}

export async function POST(req) {
  const user = await checkUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const data = await req.json();
  const jar = await db.savingsJar.create({
    data: {
      ...data,
      userId: user.id,
    },
  });
  return Response.json(jar);
}
