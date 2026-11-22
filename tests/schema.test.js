const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const read = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("schema contains the 12 required base tables, three views and four procedures", () => {
  const sql = read("db/init/01_schema.sql");
  assert.equal((sql.match(/CREATE TABLE /g) || []).length, 12);
  assert.equal((sql.match(/CREATE OR REPLACE VIEW /g) || []).length, 3);
  assert.equal((sql.match(/CREATE PROCEDURE /g) || []).length, 4);
});

test("initial dataset defines 30 users, 52 dishes, 84 menus and 365 reservations", () => {
  const sql = read("db/init/02_seed.sql");
  assert.equal(
    (
      sql.match(
        /\('(?:Demo Öğrenci|Demo Personel|Demo Yönetici|Öğrenci \d{2})'/g,
      ) || []
    ).length,
    30,
  );
  assert.equal((sql.match(/\([1-7],'[^']+',\d+,\d\)/g) || []).length, 52);
  assert.match(sql, /UNION ALL SELECT 13\) d/);
  assert.match(sql, /WHILE n<365 DO/);
  assert.match(sql, /SET v_offset=MOD\(n,78\)/);
  assert.match(sql, /LIMIT v_offset,1/);
});

test("phase four migration preserves older full portion reservations by default", () => {
  const sql = read("db/migrations/04_degisiklik.sql");
  assert.match(
    sql,
    /ADD COLUMN porsiyon ENUM\('tam','yari'\) NOT NULL DEFAULT 'tam'/,
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS kullanici_alerjenleri/);
  assert.match(sql, /p_porsiyon VARCHAR\(10\)/);
  assert.match(sql, /ROUND\(v_fiyat\*0\.60,2\)/);
});

test("compose defines the six required services and health-gated startup", () => {
  const compose = YAML.parse(read("docker-compose.yml"));
  assert.deepEqual(Object.keys(compose.services).sort(), [
    "application",
    "frontend",
    "mysql-primary",
    "mysql-replica",
    "redis",
    "replica-setup",
  ]);
  assert.equal(
    compose.services["mysql-primary"].healthcheck.test[0],
    "CMD-SHELL",
  );
  assert.equal(
    compose.services["mysql-replica"].command.includes("--read-only=ON"),
    true,
  );
  assert.equal(
    compose.services.application.depends_on["replica-setup"].condition,
    "service_completed_successfully",
  );
  assert.equal(compose.services.frontend.ports[0], "8080:80");
});
