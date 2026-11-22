const config = require("./config");
const { app, connect, redis } = require("./app");
const db = require("./db");

async function main() {
  await connect();
  await db.writer.query("SELECT 1");
  await db.reader.query("SELECT 1");
  const server = app.listen(config.port, () =>
    console.info(`Application listening on ${config.port}`),
  );
  const shutdown = async () => {
    server.close();
    await Promise.allSettled([db.close(), redis.quit()]);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
