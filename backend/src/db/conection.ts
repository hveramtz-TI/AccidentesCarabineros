import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function checkConnection(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 AS result`;

  if (rows[0]?.result !== 1) {
    throw new Error("Database connectivity check returned an unexpected result");
  }
}
