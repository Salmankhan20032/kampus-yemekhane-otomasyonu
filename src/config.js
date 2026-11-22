const required = ["SESSION_SECRET"];
for (const key of required) {
  if (!process.env[key])
    throw new Error(`Missing required environment variable: ${key}`);
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET,
  sessionSecure: process.env.SESSION_SECURE === "true",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  database: {
    host: process.env.DB_HOST || "127.0.0.1",
    replicaHost:
      process.env.DB_REPLICA_HOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    replicaPort: Number(
      process.env.DB_REPLICA_PORT || process.env.DB_PORT || 3306,
    ),
    user: process.env.DB_USER || "yemekhane",
    password: process.env.DB_PASSWORD || "local-app-password",
    name: process.env.DB_NAME || "yemekhane",
  },
};
