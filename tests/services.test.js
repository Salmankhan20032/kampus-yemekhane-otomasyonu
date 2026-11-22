process.env.SESSION_SECRET = "test-secret";
const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const {
  db,
  normalizeDbError,
  authenticate,
  balance,
  userById,
} = require("../src/services");

test("SQLSTATE 45000 procedure messages are returned to users as client errors", () => {
  const error = normalizeDbError({
    code: "ER_SIGNAL_EXCEPTION",
    sqlMessage: "Bakiye yetersiz.",
  });
  assert.equal(error.message, "Bakiye yetersiz.");
  assert.equal(error.status, 400);
});

test("duplicate writes are mapped to a safe conflict response", () => {
  const error = normalizeDbError({
    code: "ER_DUP_ENTRY",
    message: "secret database details",
  });
  assert.equal(error.message, "Bu işlem daha önce yapılmış.");
  assert.equal(error.status, 409);
});

test("unexpected database errors retain their diagnostic information", () => {
  const original = new Error("connection lost");
  assert.equal(normalizeDbError(original), original);
});

test("post-write balance reads use the primary for read-your-writes", async () => {
  const originalExecute = db.writer.execute;
  const originalRead = db.read;
  const statements = [];
  db.writer.execute = async (sql) => {
    statements.push(sql);
    return [sql.includes("bakiye balance") ? [{ balance: 473 }] : []];
  };
  db.read = async () => {
    throw new Error("post-write balance must not use a replica");
  };
  try {
    assert.deepEqual(await balance(1, true), { balance: 473, ledger: [] });
    assert.equal(statements.length, 2);
  } finally {
    db.writer.execute = originalExecute;
    db.read = originalRead;
  }
});

test("session user refreshes read from the primary", async () => {
  const originalExecute = db.writer.execute;
  const originalRead = db.read;
  db.writer.execute = async () => [
    [
      {
        id: 1,
        ad_soyad: "Demo Öğrenci",
        email: "ogrenci@kampus.edu",
        rol: "ogrenci",
        bakiye: 473,
      },
    ],
  ];
  db.read = async () => {
    throw new Error("session user refresh must not use a replica");
  };
  try {
    assert.equal((await userById(1)).balance, 473);
  } finally {
    db.writer.execute = originalExecute;
    db.read = originalRead;
  }
});

test("demo password hash authenticates with bcrypt and rejects the wrong password", async () => {
  const originalRead = db.read;
  db.read = async () => [
    {
      id: 1,
      ad_soyad: "Demo Öğrenci",
      email: "ogrenci@kampus.edu",
      sifre_hash:
        "$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi",
      rol: "ogrenci",
      bakiye: 500,
    },
  ];
  try {
    assert.ok(
      await bcrypt.compare(
        "password",
        "$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi",
      ),
    );
    assert.equal(
      (await authenticate("ogrenci@kampus.edu", "password")).role,
      "ogrenci",
    );
    assert.equal(await authenticate("ogrenci@kampus.edu", "incorrect"), null);
  } finally {
    db.read = originalRead;
  }
});
