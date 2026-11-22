const bcrypt = require("bcryptjs");
const db = require("./db");

function normalizeDbError(error) {
  if (error.code === "ER_SIGNAL_EXCEPTION" || error.sqlState === "45000") {
    const e = new Error(error.sqlMessage || error.message);
    e.status = 400;
    return e;
  }
  if (error.code === "ER_DUP_ENTRY") {
    const e = new Error("Bu işlem daha önce yapılmış.");
    e.status = 409;
    return e;
  }
  return error;
}

const userView = ({ id, ad_soyad, email, rol, bakiye }) => ({
  id,
  name: ad_soyad,
  email,
  role: rol,
  balance: Number(bakiye),
});

async function authenticate(email, password) {
  const rows = await db.read(
    "SELECT id, ad_soyad, email, sifre_hash, rol, bakiye FROM kullanicilar WHERE email=? AND aktif=1",
    [email],
  );
  if (!rows.length || !(await bcrypt.compare(password, rows[0].sifre_hash)))
    return null;
  return userView(rows[0]);
}

async function listCanteens() {
  return db.read(
    "SELECT id,name,capacity FROM (SELECT id,ad name,kapasite capacity FROM yemekhaneler) c ORDER BY id",
  );
}

async function listMeals() {
  return db.read(
    "SELECT id,ad name,rezervasyon_son_saati cutoff FROM ogunler ORDER BY id",
  );
}

async function menusForDate(canteenId, date) {
  return db.read(
    `SELECT m.id menuId, m.yemekhane_id canteenId, m.tarih date, m.ogun_id mealId,
      o.ad meal, o.rezervasyon_son_saati cutoff, m.ogrenci_fiyati studentPrice,
      m.personel_fiyati staffPrice, d.kapasite capacity, d.dolu occupied, d.bos available,
      p.ortalama_puan rating, p.oy_sayisi ratingCount
    FROM menuler m JOIN ogunler o ON o.id=m.ogun_id
    JOIN v_menu_doluluk d ON d.menu_id=m.id JOIN v_menu_puan p ON p.menu_id=m.id
    WHERE m.yemekhane_id=? AND m.tarih BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
    ORDER BY m.tarih,o.id`,
    [canteenId, date, date],
  );
}

async function menuDetails(menuId, fromSource = false) {
  const query = `SELECT menu_id menuId,yemekhane_id canteenId,tarih date,ogun_id mealId,
      ogun meal,yemek_id id,yemek name,kalori calories,vejetaryen vegetarian,
      kategori category,kategori_sira categoryOrder,alerjenler allergens
    FROM v_menu_detay WHERE menu_id=? ORDER BY kategori_sira,yemek_id`;
  return fromSource
    ? (await db.writer.execute(query, [menuId]))[0]
    : db.read(query, [menuId]);
}

async function menuAllergenIds(menuId) {
  return db.read(
    `SELECT DISTINCT ya.alerjen_id id FROM menu_yemekleri my
    JOIN yemek_alerjenleri ya ON ya.yemek_id=my.yemek_id WHERE my.menu_id=?`,
    [menuId],
  );
}

async function reservations(userId) {
  return db.read(
    `SELECT r.id,r.menu_id menuId,r.durum status,r.tutar amount,r.porsiyon portion,
      m.tarih date,o.ad meal,y.ad canteen,o.rezervasyon_son_saati cutoff
    FROM rezervasyonlar r JOIN menuler m ON m.id=r.menu_id JOIN ogunler o ON o.id=m.ogun_id
    JOIN yemekhaneler y ON y.id=m.yemekhane_id WHERE r.kullanici_id=?
    ORDER BY m.tarih DESC,o.id`,
    [userId],
  );
}

async function balance(userId) {
  const [users, ledger] = await Promise.all([
    db.read("SELECT bakiye balance FROM kullanicilar WHERE id=?", [userId]),
    db.read(
      "SELECT id,tur type,tutar amount,aciklama description,created_at createdAt FROM bakiye_hareketleri WHERE kullanici_id=? ORDER BY created_at DESC,id DESC LIMIT 50",
      [userId],
    ),
  ]);
  return { balance: Number(users[0]?.balance || 0), ledger };
}

async function review(userId, menuId, rating, comment) {
  const rows = await db.read(
    `SELECT 1 FROM rezervasyonlar WHERE kullanici_id=? AND menu_id=? AND durum='kullanildi'`,
    [userId, menuId],
  );
  if (!rows.length)
    throw Object.assign(
      new Error("Yalnızca kullanılmış menüler değerlendirilebilir."),
      { status: 400 },
    );
  await db.write(
    "INSERT INTO degerlendirmeler(kullanici_id,menu_id,puan,yorum) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE puan=VALUES(puan),yorum=VALUES(yorum)",
    [userId, menuId, rating, comment],
  );
}

async function profileAllergens(userId) {
  const [allergens, selected] = await Promise.all([
    db.read("SELECT id,ad name FROM alerjenler ORDER BY ad"),
    db.read(
      "SELECT alerjen_id id FROM kullanici_alerjenleri WHERE kullanici_id=?",
      [userId],
    ),
  ]);
  return { allergens, selected: selected.map((x) => x.id) };
}

async function setProfileAllergens(userId, ids) {
  const conn = await db.writer.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "DELETE FROM kullanici_alerjenleri WHERE kullanici_id=?",
      [userId],
    );
    for (const id of ids)
      await conn.execute(
        "INSERT INTO kullanici_alerjenleri(kullanici_id,alerjen_id) VALUES(?,?)",
        [userId, id],
      );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw normalizeDbError(error);
  } finally {
    conn.release();
  }
}

async function adminSummary() {
  return db.read(`SELECT m.id menuId,m.tarih date,y.ad canteen,o.ad meal,d.kapasite capacity,
      d.dolu occupied,d.bos available,p.ortalama_puan rating,p.oy_sayisi ratingCount
    FROM menuler m JOIN yemekhaneler y ON y.id=m.yemekhane_id JOIN ogunler o ON o.id=m.ogun_id
    JOIN v_menu_doluluk d ON d.menu_id=m.id JOIN v_menu_puan p ON p.menu_id=m.id
    WHERE m.tarih>=CURDATE() ORDER BY m.tarih,o.id,y.id`);
}

async function adminActiveReservations() {
  return db.read(`SELECT r.id,r.kullanici_id userId,u.ad_soyad student,r.menu_id menuId,m.tarih date,
      o.ad meal,y.ad canteen,r.porsiyon portion
    FROM rezervasyonlar r JOIN kullanicilar u ON u.id=r.kullanici_id
    JOIN menuler m ON m.id=r.menu_id JOIN ogunler o ON o.id=m.ogun_id
    JOIN yemekhaneler y ON y.id=m.yemekhane_id WHERE r.durum='aktif'
    ORDER BY m.tarih,o.id,r.id LIMIT 50`);
}

async function adminMenu({
  canteenId,
  date,
  mealId,
  studentPrice,
  staffPrice,
  dishIds,
}) {
  const conn = await db.writer.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.execute(
      "SELECT id FROM menuler WHERE yemekhane_id=? AND tarih=? AND ogun_id=? FOR UPDATE",
      [canteenId, date, mealId],
    );
    let menuId;
    if (existing.length) {
      menuId = existing[0].id;
      await conn.execute(
        "UPDATE menuler SET ogrenci_fiyati=?,personel_fiyati=? WHERE id=?",
        [studentPrice, staffPrice, menuId],
      );
      await conn.execute("DELETE FROM menu_yemekleri WHERE menu_id=?", [
        menuId,
      ]);
    } else {
      const [result] = await conn.execute(
        "INSERT INTO menuler(yemekhane_id,tarih,ogun_id,ogrenci_fiyati,personel_fiyati) VALUES(?,?,?,?,?)",
        [canteenId, date, mealId, studentPrice, staffPrice],
      );
      menuId = result.insertId;
    }
    for (const dishId of dishIds)
      await conn.execute(
        "INSERT INTO menu_yemekleri(menu_id,yemek_id) VALUES(?,?)",
        [menuId, dishId],
      );
    await conn.commit();
    return menuId;
  } catch (error) {
    await conn.rollback();
    throw normalizeDbError(error);
  } finally {
    conn.release();
  }
}

async function dishCatalog() {
  return db.read(
    "SELECT y.id,y.ad name,k.ad category FROM yemekler y JOIN yemek_kategorileri k ON k.id=y.kategori_id ORDER BY k.sira,y.ad",
  );
}

async function userById(id) {
  const rows = await db.read(
    "SELECT id,ad_soyad,email,rol,bakiye FROM kullanicilar WHERE id=?",
    [id],
  );
  return rows.length ? userView(rows[0]) : null;
}

module.exports = {
  db,
  normalizeDbError,
  authenticate,
  listCanteens,
  listMeals,
  menusForDate,
  menuDetails,
  menuAllergenIds,
  reservations,
  balance,
  review,
  profileAllergens,
  setProfileAllergens,
  adminSummary,
  adminActiveReservations,
  adminMenu,
  dishCatalog,
  userById,
};
