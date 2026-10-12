import { checkConnection, prisma } from "./conection.js";

async function main(): Promise<void> {
  let connected = false;

  try {
    await checkConnection();
    connected = true;
  } catch {
    connected = false;
  }

  try {
    await prisma.$disconnect();
  } catch {
    connected = false;
  }

  if (connected) {
    console.log("Database connection check succeeded (SELECT 1).");
    return;
  }

  console.error("Database connection check failed; verify DATABASE_NEON_URL and database network availability.");
  process.exitCode = 1;
}

await main();
