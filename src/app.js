const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { createClient } = require("redis");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const services = require("./services");

const redis = createClient({ url: config.redisUrl });
redis.on("error", (error) => console.error("Redis connection:", error.message));

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(
  session({
    name: "kampus.sid",
    store: new RedisStore({ client: redis, prefix: "oturum:" }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.sessionSecure,
      maxAge: 30 * 60 * 1000,
    },
  }),
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const requireUser = (req, res, next) =>
  req.session.user
    ? next()
    : res.status(401).json({ error: "Devam etmek için giriş yapın." });
const requireAdmin = (req, res, next) =>
  req.session.user?.role === "yonetici"
    ? next()
    : res
        .status(403)
        .json({ error: "Bu işlem için yönetici yetkisi gerekir." });
const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};
const positiveInt = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0;
const publicUser = ({ id, name, email, role, balance }) => ({
  id,
  name,
  email,
  role,
  balance,
});

async function cacheDelete(pattern) {
  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 }))
    await redis.del(key);
}

app.get(
  "/health",
  asyncRoute(async (_req, res) => {
    await redis.ping();
    await services.db.writer.query("SELECT 1");
    await services.db.reader.query("SELECT 1");
    res.json({ status: "ok" });
  }),
);

app.get("/api/session", (req, res) =>
  res.json({ user: req.session.user ? publicUser(req.session.user) : null }),
);
app.post(
  "/api/auth/login",
  loginLimiter,
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password || password.length > 200)
      return res.status(400).json({ error: "E-posta ve şifre gerekli." });
    const user = await services.authenticate(email, password);
    if (!user)
      return res.status(401).json({ error: "E-posta veya şifre hatalı." });
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: "Oturum açılamadı." });
      req.session.user = user;
      req.session.save((saveError) =>
        saveError
          ? res.status(500).json({ error: "Oturum kaydedilemedi." })
          : res.json({ user: publicUser(user) }),
      );
    });
  }),
);
app.post("/api/auth/logout", (req, res, next) => {
  const sid = req.sessionID;
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("kampus.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: config.sessionSecure,
    });
    console.info(`session deleted: ${sid}`);
    res.status(204).end();
  });
});

app.get(
  "/api/lookups",
  requireUser,
  asyncRoute(async (_req, res) => {
    const [canteens, meals] = await Promise.all([
      services.listCanteens(),
      services.listMeals(),
    ]);
    res.json({ canteens, meals });
  }),
);

app.get(
  "/api/menus",
  requireUser,
  asyncRoute(async (req, res) => {
    const canteenId = Number(req.query.canteenId || 1);
    const from = String(
      req.query.from || new Date().toISOString().slice(0, 10),
    );
    if (!positiveInt(canteenId) || !isDate(from))
      return res
        .status(400)
        .json({ error: "Yemekhane veya tarih bilgisi geçersiz." });
    res.json({ menus: await services.menusForDate(canteenId, from) });
  }),
);

app.get(
  "/api/menus/:id",
  requireUser,
  asyncRoute(async (req, res) => {
    if (!positiveInt(req.params.id))
      return res.status(400).json({ error: "Menü numarası geçersiz." });
    const [menu] = await services.db.read(
      `SELECT id,yemekhane_id canteenId,tarih date,ogun_id mealId FROM menuler WHERE id=?`,
      [req.params.id],
    );
    if (!menu) return res.status(404).json({ error: "Menü bulunamadı." });
    const date = new Date(menu.date).toISOString().slice(0, 10);
    const key = `menu:${menu.canteenId}:${date}:${menu.mealId}`;
    let details = await redis.get(key);
    if (details) {
      console.info(`menu cache hit: ${key}`);
      details = JSON.parse(details);
    } else {
      details = await services.menuDetails(menu.id);
      const untilMidnight = Math.max(
        60,
        Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 1000),
      );
      await redis.setEx(key, untilMidnight, JSON.stringify(details));
      console.info(`menu cache miss: ${key}`);
    }
    res.json({ dishes: details });
  }),
);

app.get(
  "/api/reservations",
  requireUser,
  asyncRoute(async (req, res) =>
    res.json({
      reservations: await services.reservations(req.session.user.id),
    }),
  ),
);
app.post(
  "/api/reservations",
  requireUser,
  asyncRoute(async (req, res) => {
    const menuId = Number(req.body.menuId);
    const portion = req.body.portion ?? "tam";
    if (!["tam", "yari"].includes(portion))
      return res.status(400).json({ error: "Porsiyon seçimi geçersiz." });
    if (!positiveInt(menuId))
      return res.status(400).json({ error: "Menü seçimi geçersiz." });
    try {
      await services.db.callProcedure("CALL sp_rezervasyon_yap(?,?,?)", [
        req.session.user.id,
        menuId,
        portion,
      ]);
    } catch (error) {
      throw services.normalizeDbError(error);
    }
    req.session.user = await services.userById(req.session.user.id); // Kaynaktan okuma: replika gecikmesine karşı.
    res.json({
      message: "Rezervasyon oluşturuldu.",
      balance: req.session.user.balance,
    });
  }),
);
app.delete(
  "/api/reservations/:id",
  requireUser,
  asyncRoute(async (req, res) => {
    if (!positiveInt(req.params.id))
      return res.status(400).json({ error: "Rezervasyon numarası geçersiz." });
    try {
      await services.db.callProcedure("CALL sp_rezervasyon_iptal(?,?)", [
        req.session.user.id,
        req.params.id,
      ]);
    } catch (error) {
      throw services.normalizeDbError(error);
    }
    req.session.user = await services.userById(req.session.user.id);
    res.json({
      message: "Rezervasyon iptal edildi ve ücret iade edildi.",
      balance: req.session.user.balance,
    });
  }),
);

app.get(
  "/api/balance",
  requireUser,
  asyncRoute(async (req, res) =>
    res.json(await services.balance(req.session.user.id)),
  ),
);
app.post(
  "/api/balance/top-up",
  requireUser,
  asyncRoute(async (req, res) => {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 5000)
      return res
        .status(400)
        .json({ error: "Yükleme tutarı 1–5000 TL arasında olmalıdır." });
    await services.db.callProcedure("CALL sp_bakiye_yukle(?,?)", [
      req.session.user.id,
      amount,
    ]);
    req.session.user = await services.userById(req.session.user.id);
    res.json({
      ...(await services.balance(req.session.user.id, true)),
      message: "Bakiye yüklendi.",
    });
  }),
);

app.post(
  "/api/reviews",
  requireUser,
  asyncRoute(async (req, res) => {
    const menuId = Number(req.body.menuId);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "")
      .trim()
      .slice(0, 1000);
    if (
      !positiveInt(menuId) ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    )
      return res
        .status(400)
        .json({ error: "Menü ve 1–5 arasında puan seçin." });
    await services.review(req.session.user.id, menuId, rating, comment);
    res.status(201).json({ message: "Değerlendirmeniz kaydedildi." });
  }),
);

app.get(
  "/api/profile/allergens",
  requireUser,
  asyncRoute(async (req, res) =>
    res.json(await services.profileAllergens(req.session.user.id)),
  ),
);
app.put(
  "/api/profile/allergens",
  requireUser,
  asyncRoute(async (req, res) => {
    const ids = req.body.allergenIds;
    if (
      !Array.isArray(ids) ||
      ids.length > 30 ||
      ids.some((id) => !positiveInt(id))
    )
      return res.status(400).json({ error: "Alerjen seçimi geçersiz." });
    const uniqueIds = [...new Set(ids.map(Number))];
    const rows = await services.db.read(
      `SELECT id FROM alerjenler WHERE id IN (${uniqueIds.length ? uniqueIds.map(() => "?").join(",") : "NULL"})`,
      uniqueIds,
    );
    if (rows.length !== uniqueIds.length)
      return res
        .status(400)
        .json({ error: "Listede olmayan bir alerjen seçildi." });
    await services.setProfileAllergens(req.session.user.id, uniqueIds);
    res.json({ message: "Alerjen profiliniz güncellendi." });
  }),
);

app.get(
  "/api/admin/summary",
  requireUser,
  requireAdmin,
  asyncRoute(async (_req, res) =>
    res.json({ menus: await services.adminSummary() }),
  ),
);
app.get(
  "/api/admin/reservations",
  requireUser,
  requireAdmin,
  asyncRoute(async (_req, res) =>
    res.json({ reservations: await services.adminActiveReservations() }),
  ),
);
app.post(
  "/api/admin/turnstile",
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { userId, menuId } = req.body;
    if (!positiveInt(userId) || !positiveInt(menuId))
      return res
        .status(400)
        .json({ error: "Kullanıcı veya menü seçimi geçersiz." });
    await services.db.callProcedure("CALL sp_turnike_gecis(?,?)", [
      Number(userId),
      Number(menuId),
    ]);
    res.json({ message: "Turnike geçişi işlendi." });
  }),
);
app.get(
  "/api/admin/dishes",
  requireUser,
  requireAdmin,
  asyncRoute(async (_req, res) =>
    res.json({ dishes: await services.dishCatalog() }),
  ),
);
app.put(
  "/api/admin/menus",
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { canteenId, date, mealId, studentPrice, staffPrice, dishIds } =
      req.body;
    if (
      !positiveInt(canteenId) ||
      !positiveInt(mealId) ||
      !isDate(date) ||
      !Number.isFinite(Number(studentPrice)) ||
      !Number.isFinite(Number(staffPrice)) ||
      Number(studentPrice) < 0 ||
      Number(staffPrice) < 0 ||
      !Array.isArray(dishIds) ||
      dishIds.length < 1 ||
      dishIds.length > 20 ||
      dishIds.some((id) => !positiveInt(id))
    ) {
      return res.status(400).json({ error: "Menü bilgilerini kontrol edin." });
    }
    const idList = [...new Set(dishIds.map(Number))];
    const existing = await services.db.read(
      `SELECT id FROM yemekler WHERE id IN (${idList.map(() => "?").join(",")})`,
      idList,
    );
    if (existing.length !== idList.length)
      return res.status(400).json({ error: "Geçersiz yemek seçimi." });
    const menuId = await services.adminMenu({
      canteenId: Number(canteenId),
      date,
      mealId: Number(mealId),
      studentPrice: Number(studentPrice),
      staffPrice: Number(staffPrice),
      dishIds: idList,
    });
    await cacheDelete(`menu:${canteenId}:${date}:*`);
    const sourceRows = await services.menuDetails(menuId, true);
    const cacheKey = `menu:${canteenId}:${date}:${mealId}`;
    const ttl = Math.max(
      60,
      Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 1000),
    );
    await redis.setEx(cacheKey, ttl, JSON.stringify(sourceRows));
    console.info(`menu cache invalidated: menu:${canteenId}:${date}:*`);
    res.json({ message: "Menü kaydedildi.", menuId });
  }),
);

app.use("/api", (_req, res) =>
  res.status(404).json({ error: "İstenen API adresi bulunamadı." }),
);
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    error: status >= 500 ? "İşlem sırasında bir hata oluştu." : error.message,
  });
});

async function connect() {
  await redis.connect();
}
module.exports = { app, connect, redis };
