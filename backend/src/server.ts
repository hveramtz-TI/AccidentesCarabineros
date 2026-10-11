import { buildApp } from "./app.js";

const HOST = "0.0.0.0"; // Cloud Run requires binding all interfaces, not loopback.
const PORT = Number(process.env.PORT) || 8080; // Cloud Run injects PORT.

const app = buildApp({
  // Runtime environment, never a source-level default: Cloud Run injects
  // UUID_CONNECTION from Secret Manager; local Compose passes it per T4.
  authToken: process.env.UUID_CONNECTION ?? null,
  corsOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info(`Received ${signal}, closing server`);
  await app.close();
  process.exit(0);
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ host: HOST, port: PORT });
  app.log.info(`Backend listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
