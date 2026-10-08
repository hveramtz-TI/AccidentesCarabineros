import { buildApp } from "./app.js";

const HOST = "0.0.0.0"; // Cloud Run requires binding all interfaces, not loopback.
const PORT = Number(process.env.PORT) || 8080; // Cloud Run injects PORT.

const app = buildApp();

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
