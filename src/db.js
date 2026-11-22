const mysql = require("mysql2/promise");
const { database } = require("./config");

const poolOptions = (host, port) => ({
  host,
  port,
  user: database.user,
  password: database.password,
  database: database.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  charset: "utf8mb4",
});

const writer = mysql.createPool(poolOptions(database.host, database.port));
const reader = mysql.createPool(
  poolOptions(database.replicaHost, database.replicaPort),
);

async function read(sql, params = []) {
  const [rows] = await reader.execute(sql, params);
  return rows;
}

async function write(sql, params = []) {
  const [result] = await writer.execute(sql, params);
  return result;
}

async function callProcedure(sql, params = []) {
  const [result] = await writer.query(sql, params);
  return result;
}

async function close() {
  await Promise.all([writer.end(), reader.end()]);
}

module.exports = { writer, reader, read, write, callProcedure, close };
