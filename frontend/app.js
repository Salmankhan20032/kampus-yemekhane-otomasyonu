const state = {
  user: null,
  page: "menu",
  canteens: [],
  meals: [],
  selectedDate: null,
  menus: [],
  allergens: [],
  selectedAllergens: [],
  dishes: [],
};
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const dateString = (date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const fmtDate = (
  date,
  options = { weekday: "short", day: "numeric", month: "short" },
) =>
  new Intl.DateTimeFormat("tr-TR", {
    ...options,
    timeZone: "Europe/Istanbul",
  }).format(new Date(`${date}T12:00:00Z`));
const money = (value) =>
  `${Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const safe = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = `toast show${error ? " error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = "toast"), 3500);
}
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let payload = null;
  if (response.status !== 204) {
    payload = await response
      .json()
      .catch(() => ({ error: "Sunucudan geçersiz yanıt alındı." }));
  }
  if (!response.ok) {
    if (response.status === 401 && state.user) {
      state.user = null;
      showLogin();
    }
    throw new Error(payload?.error || "İşlem tamamlanamadı.");
  }
  return payload;
}
function showLogin() {
  $("#app-shell").hidden = true;
  $("#login-screen").hidden = false;
}
function showApp() {
  $("#login-screen").hidden = true;
  $("#app-shell").hidden = false;
  $("#avatar").textContent = state.user.name
    .trim()
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr-TR");
  $$(".admin-only").forEach(
    (el) => (el.hidden = state.user.role !== "yonetici"),
  );
  $("#today").textContent = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  loadLookups().then(() => navigate("menu"));
}
async function loadLookups() {
  const data = await api("/lookups");
  state.canteens = data.canteens;
  state.meals = data.meals;
  const profile = await api("/profile/allergens");
  state.allergens = profile.allergens;
  state.selectedAllergens = profile.selected;
}
function navigate(page) {
  if (page === "admin" && state.user.role !== "yonetici") page = "menu";
  state.page = page;
  $$(".nav-item[data-page]").forEach((el) =>
    el.classList.toggle("active", el.dataset.page === page),
  );
  $("#crumb").textContent = {
    menu: "Günün menüsü",
    reservations: "Rezervasyonlarım",
    balance: "Bakiyem",
    reviews: "Değerlendirme",
    profile: "Alerjen profilim",
    admin: "Yönetim paneli",
  }[page];
  $(".sidebar").classList.remove("open");
  renderPage().catch((e) => toast(e.message, true));
}
async function renderPage() {
  if (state.page === "menu") return renderMenu();
  if (state.page === "reservations") return renderReservations();
  if (state.page === "balance") return renderBalance();
  if (state.page === "reviews") return renderReviews();
  if (state.page === "profile") return renderProfile();
  if (state.page === "admin") return renderAdmin();
}
function dateRange(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return dateString(d);
  });
}
function mealIcon(meal) {
  return meal === "Kahvaltı" ? "🥣" : meal === "Öğle" ? "☀️" : "🌙";
}
function dayControl() {
  const dates = dateRange(state.selectedDate);
  return `<div class="date-strip"><button class="week-shift" data-shift="-7" aria-label="Önceki hafta">‹</button>${dates.map((d, i) => `<button class="day-chip ${d === state.selectedDate ? "selected" : ""}" data-date="${d}"><strong>${i === 0 && d === dateString(new Date()) ? "Bugün" : safe(fmtDate(d, { weekday: "short" }))}</strong>${safe(fmtDate(d, { day: "numeric", month: "short" }))}</button>`).join("")}<button class="week-shift" data-shift="7" aria-label="Sonraki hafta">›</button></div>`;
}
async function loadMenus() {
  const canteenId = $("#canteen-select")?.value || "1";
  const data = await api(
    `/menus?canteenId=${encodeURIComponent(canteenId)}&from=${state.selectedDate}`,
  );
  state.menus = data.menus;
}
async function renderMenu() {
  if (!state.selectedDate) state.selectedDate = dateString(new Date());
  $("#view").innerHTML =
    `<div class="page-head"><div><span class="section-kicker">AFİYET OLSUN</span><h2>Günün menüsü</h2><p>Bugün tabağında neler var, ${safe(state.user.name.split(" ")[0])}?</p></div><div class="filters"><select id="canteen-select" aria-label="Yemekhane seç">${state.canteens.map((c) => `<option value="${c.id}">${safe(c.name)}</option>`).join("")}</select></div></div>${dayControl()}<div id="meals-content"><div class="empty">Menüler yükleniyor…</div></div>`;
  $("#canteen-select").value = localStorage.getItem("canteenId") || "1";
  $("#canteen-select").onchange = () => {
    localStorage.setItem("canteenId", $("#canteen-select").value);
    renderMenu();
  };
  $$("[data-date]").forEach(
    (b) =>
      (b.onclick = () => {
        state.selectedDate = b.dataset.date;
        renderMenu();
      }),
  );
  $$("[data-shift]").forEach(
    (b) =>
      (b.onclick = () => {
        const d = new Date(`${state.selectedDate}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + Number(b.dataset.shift));
        state.selectedDate = dateString(d);
        renderMenu();
      }),
  );
  await loadMenus();
  await renderMenuCards();
}
async function renderMenuCards() {
  const target = $("#meals-content");
  const dateMenus = state.menus.filter(
    (m) => String(m.date).slice(0, 10) === state.selectedDate,
  );
  if (!dateMenus.length) {
    target.innerHTML =
      '<div class="empty"><strong>Bu gün için menü henüz yayınlanmadı.</strong>Başka bir tarihe göz atabilirsin.</div>';
    return;
  }
  const prices = state.user.role === "ogrenci" ? "studentPrice" : "staffPrice";
  const cards = await Promise.all(
    dateMenus.map(async (menu) => {
      let dishes = [];
      try {
        dishes = (await api(`/menus/${menu.menuId}`)).dishes;
      } catch {}
      const cal = dishes.reduce((n, d) => n + Number(d.calories || 0), 0);
      const allergenHit = dishes.filter((d) => {
        const dishAllergens = String(d.allergens || "")
          .split(",")
          .map((s) => s.trim());
        const mine = state.allergens
          .filter((a) => state.selectedAllergens.includes(a.id))
          .map((a) => a.name);
        return dishAllergens.some((a) => mine.includes(a));
      });
      const cutoffPassed =
        String(menu.date).slice(0, 10) === dateString(new Date()) &&
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Istanbul",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        }).format(new Date()) > String(menu.cutoff).slice(0, 8);
      const canHalf = menu.meal !== "Kahvaltı";
      return `<article class="meal-card"><div class="meal-top"><span class="meal-icon ${menu.meal === "Öğle" ? "lunch" : menu.meal === "Akşam" ? "dinner" : ""}">${mealIcon(menu.meal)}</span><span class="tag gray">Son saat ${String(menu.cutoff).slice(0, 5)}</span></div><h3>${safe(menu.meal)}</h3><div class="meal-sub">${safe($("#canteen-select").selectedOptions[0].textContent)} · ${menu.available} boş yer</div><div class="menu-list">${
        dishes.length
          ? dishes
              .map(
                (d) =>
                  `<div class="dish-row"><div class="dish-main"><span class="dish-dot"></span><div><div class="dish-name">${safe(d.name)}</div><div class="dish-meta">${safe(d.category)} · ${d.calories} kcal${d.vegetarian ? " · Vejetaryen" : ""}</div></div></div>${
                    state.selectedAllergens.length &&
                    String(d.allergens || "")
                      .split(",")
                      .some((a) =>
                        state.allergens.some(
                          (x) =>
                            state.selectedAllergens.includes(x.id) &&
                            x.name === a.trim(),
                        ),
                      )
                      ? '<span class="dish-alert">Alerjenin var</span>'
                      : ""
                  }</div>`,
              )
              .join("")
          : '<div class="muted-line">Yemek listesi hazırlanıyor.</div>'
      }</div><div class="calorie-line">◌ Toplam ${cal} kcal${allergenHit.length ? ` · <span class="dish-alert">${allergenHit.length} yemek alerjen içeriyor</span>` : ""}</div><div class="meal-foot"><div class="price">${money(menu[prices])}<small> / tam porsiyon</small></div><span class="availability">${menu.available > 0 ? "● Yer var" : "● Dolu"}</span></div><div class="meal-actions"><button class="button button-outline" data-details="${menu.menuId}">Menü detayı</button><button class="button button-dark" data-book="${menu.menuId}" data-half="${canHalf}" ${menu.available <= 0 || cutoffPassed ? "disabled" : ""}>Rezervasyon</button></div></article>`;
    }),
  );
  target.innerHTML = `<div class="meal-grid">${cards.join("")}</div>`;
  $$("[data-book]", target).forEach(
    (button) =>
      (button.onclick = () =>
        reserve(button.dataset.book, button.dataset.half === "true")),
  );
  $$("[data-details]", target).forEach(
    (button) => (button.onclick = () => showDetails(button.dataset.details)),
  );
}
async function showDetails(menuId) {
  try {
    const { dishes } = await api(`/menus/${menuId}`);
    alert(
      dishes
        .map(
          (d) =>
            `${d.name} · ${d.calories} kcal${d.vegetarian ? " · Vejetaryen" : ""}${d.allergens ? ` · Alerjen: ${d.allergens}` : ""}`,
        )
        .join("\n"),
    );
  } catch (e) {
    toast(e.message, true);
  }
}
async function reserve(menuId, halfAllowed) {
  let portion = "tam";
  if (halfAllowed) {
    portion = confirm(
      "Yarım porsiyon ister misiniz? Ücret tam fiyatın %60’ıdır.",
    )
      ? "yari"
      : "tam";
  }
  try {
    const result = await api("/reservations", {
      method: "POST",
      body: JSON.stringify({ menuId: Number(menuId), portion }),
    });
    state.user.balance = result.balance;
    toast(`${result.message} Yeni bakiye: ${money(result.balance)}`);
    await renderMenu();
  } catch (e) {
    toast(e.message, true);
  }
}
async function renderReservations() {
  const { reservations } = await api("/reservations");
  const rows = reservations
    .map(
      (r) =>
        `<tr><td><b>${safe(fmtDate(String(r.date).slice(0, 10), { day: "numeric", month: "long", year: "numeric" }))}</b><div class="muted-line">${safe(r.canteen)}</div></td><td>${safe(r.meal)}<div class="muted-line">${r.portion === "yari" ? "Yarım porsiyon" : "Tam porsiyon"}</div></td><td>${money(r.amount)}</td><td><span class="status ${r.status === "kullanildi" ? "used" : r.status === "iptal" ? "cancelled" : ""}">${r.status === "aktif" ? "Aktif" : r.status === "kullanildi" ? "Kullanıldı" : "İptal"}</span></td><td>${r.status === "aktif" ? `<button class="button button-danger small-button" data-cancel="${r.id}">İptal et</button>` : "—"}</td></tr>`,
    )
    .join("");
  $("#view").innerHTML =
    `<div class="page-head"><div><span class="section-kicker">PLANLARIN</span><h2>Rezervasyonlarım</h2><p>Yaklaşan öğünlerin ve geçmiş kayıtların burada.</p></div></div><section class="panel"><div class="table-wrap"><table><thead><tr><th>Tarih / yemekhane</th><th>Öğün</th><th>Tutar</th><th>Durum</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted-line">Henüz rezervasyon bulunmuyor.</td></tr>'}</tbody></table></div></section>`;
  $$("[data-cancel]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (
          !confirm(
            "Rezervasyonu iptal edip ücret iadesi almak istiyor musunuz?",
          )
        )
          return;
        try {
          const result = await api(`/reservations/${b.dataset.cancel}`, {
            method: "DELETE",
          });
          state.user.balance = result.balance;
          toast(result.message);
          renderReservations();
        } catch (e) {
          toast(e.message, true);
        }
      }),
  );
}
async function renderBalance() {
  const data = await api("/balance");
  state.user.balance = data.balance;
  const rows = data.ledger
    .map(
      (x) =>
        `<tr><td>${safe(new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(x.createdAt)))}</td><td>${safe(x.description)}</td><td><span class="tag ${x.type === "iade" || x.type === "yukleme" ? "" : "gray"}">${x.type === "yukleme" ? "Yükleme" : x.type === "rezervasyon" ? "Rezervasyon" : "İade"}</span></td><td><b class="${Number(x.amount) < 0 ? "dish-alert" : ""}">${Number(x.amount) > 0 ? "+" : ""}${money(x.amount)}</b></td></tr>`,
    )
    .join("");
  $("#view").innerHTML =
    `<div class="page-head"><div><span class="section-kicker">HESABIN</span><h2>Bakiyem</h2><p>Harcama ve iadelerin tek yerde.</p></div></div><div class="balance-grid"><section class="balance-card"><p>KULLANILABİLİR BAKİYE</p><div class="balance-amount">${money(data.balance)}</div><button id="top-up-open" class="button button-dark">Bakiye yükle <span>＋</span></button></section><section class="panel"><span class="section-kicker">KOLAY YÜKLEME</span><h3>Öğününü planla</h3><p class="muted">Bakiye yükleyerek rezervasyonunu önceden oluşturabilirsin.</p><div class="toolbar"><button class="button button-soft quick-amount" data-amount="100">+100 ₺</button><button class="button button-soft quick-amount" data-amount="250">+250 ₺</button><button class="button button-soft quick-amount" data-amount="500">+500 ₺</button></div></section></div><section class="panel section-gap"><div class="panel-head"><h3>Hesap hareketleri</h3><span class="muted-line">Son 50 işlem</span></div><div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Açıklama</th><th>İşlem</th><th>Tutar</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted-line">Hareket bulunmuyor.</td></tr>'}</tbody></table></div></section>`;
  $("#top-up-open").onclick = () => topUp();
  $$(".quick-amount").forEach(
    (b) => (b.onclick = () => topUp(Number(b.dataset.amount))),
  );
}
async function topUp(preset) {
  const value =
    preset || Number(prompt("Yüklenecek tutar (1–5000 TL):", "250"));
  if (!value) return;
  try {
    const data = await api("/balance/top-up", {
      method: "POST",
      body: JSON.stringify({ amount: value }),
    });
    state.user.balance = data.balance;
    toast(data.message);
    renderBalance();
  } catch (e) {
    toast(e.message, true);
  }
}
async function renderReviews() {
  const { reservations } = await api("/reservations");
  const eligible = reservations.filter((r) => r.status === "kullanildi");
  const options = eligible
    .map(
      (r) =>
        `<option value="${r.menuId}">${safe(fmtDate(String(r.date).slice(0, 10)))} · ${safe(r.meal)} · ${safe(r.canteen)}</option>`,
    )
    .join("");
  $("#view").innerHTML =
    `<div class="page-head"><div><span class="section-kicker">GÖRÜŞÜNÜ PAYLAŞ</span><h2>Değerlendirme</h2><p>Kullanılmış menüler için puan ve yorum bırak.</p></div></div><section class="panel"><div class="panel-head"><h3>Öğün nasıldı?</h3><span class="stars">★★★★★</span></div>${eligible.length ? `<form id="review-form" class="review-form"><select name="menuId" required>${options}</select><select name="rating" aria-label="Puan seç"><option value="5">5 · Harika</option><option value="4">4 · Çok iyi</option><option value="3">3 · İyi</option><option value="2">2 · Gelişebilir</option><option value="1">1 · Beğenmedim</option></select><textarea name="comment" maxlength="1000" placeholder="Yemek ve servis hakkındaki düşüncelerin…"></textarea><button class="button button-dark" type="submit">Değerlendirmeyi gönder ↗</button></form>` : '<div class="empty"><strong>Değerlendirmeye açık öğün yok.</strong>Bir rezervasyonun kullanıldı olarak işaretlendikten sonra burada puan verebilirsin.</div>'}</section>`;
  $("#review-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const result = await api("/reviews", {
        method: "POST",
        body: JSON.stringify({
          menuId: form.get("menuId"),
          rating: form.get("rating"),
          comment: form.get("comment"),
        }),
      });
      toast(result.message);
    } catch (error) {
      toast(error.message, true);
    }
  });
}
async function renderProfile() {
  const data = await api("/profile/allergens");
  state.allergens = data.allergens;
  state.selectedAllergens = data.selected;
  $("#view").innerHTML =
    `<div class="page-head"><div><span class="section-kicker">SANA ÖZEL</span><h2>Alerjen profilim</h2><p>Seçtiğin içerikleri menülerde senin için işaretleyelim.</p></div></div><section class="panel"><div class="panel-head"><h3>Hassasiyetlerini seç</h3><span class="tag orange">${data.selected.length} seçili</span></div><div class="notice danger">Alerjen bilgileri bilgilendirme amaçlıdır. Çapraz bulaşma ihtimali için yemekhane personeline danış.</div><form id="allergen-form"><div class="check-grid allergen-list">${data.allergens.map((a) => `<label class="check-item"><input type="checkbox" value="${a.id}" ${data.selected.includes(a.id) ? "checked" : ""}>${safe(a.name)}</label>`).join("")}</div><button class="button button-dark">Tercihleri kaydet ↗</button></form></section>`;
  $("#allergen-form").onsubmit = async (e) => {
    e.preventDefault();
    const allergenIds = $$("input:checked", e.currentTarget).map((i) =>
      Number(i.value),
    );
    try {
      const result = await api("/profile/allergens", {
        method: "PUT",
        body: JSON.stringify({ allergenIds }),
      });
      state.selectedAllergens = allergenIds;
      toast(result.message);
    } catch (error) {
      toast(error.message, true);
    }
  };
}
async function renderAdmin() {
  const [{ menus }, { dishes }] = await Promise.all([
    api("/admin/summary"),
    api("/admin/dishes"),
  ]);
  state.dishes = dishes;
  const rows = menus
    .map(
      (m) =>
        `<tr><td>${safe(fmtDate(String(m.date).slice(0, 10), { day: "numeric", month: "short" }))}</td><td>${safe(m.canteen)}</td><td>${safe(m.meal)}</td><td>${m.occupied}/${m.capacity}</td><td>${m.available}</td><td>★ ${Number(m.rating).toFixed(1)} <span class="muted-line">(${m.ratingCount})</span></td></tr>`,
    )
    .join("");
  $("#view").innerHTML =
    `<div class="page-head"><div><span class="section-kicker">YEMEKHANE YÖNETİMİ</span><h2>Yönetim paneli</h2><p>Menüyü güncelle, doluluk ve değerlendirmeleri takip et.</p></div></div><div class="stats"><div class="stat-card"><span>Yayınlanan menü</span><strong>${menus.length}</strong></div><div class="stat-card"><span>Toplam rezervasyon</span><strong>${menus.reduce((a, m) => a + Number(m.occupied), 0)}</strong></div><div class="stat-card"><span>Ortalama puan</span><strong>${menus.length ? (menus.reduce((a, m) => a + Number(m.rating), 0) / menus.length).toFixed(1) : "—"} <span class="stars">★</span></strong></div></div><section class="panel"><div class="panel-head"><h3>Menü oluştur / düzenle</h3><span class="tag">Kaydedince önbellek temizlenir</span></div><form id="menu-form" class="menu-builder"><select name="canteenId" required>${state.canteens.map((c) => `<option value="${c.id}">${safe(c.name)}</option>`).join("")}</select><input name="date" type="date" value="${state.selectedDate}" required><select name="mealId" required>${state.meals.map((m) => `<option value="${m.id}">${safe(m.name)}</option>`).join("")}</select><button class="button button-dark" type="submit">Menüyü kaydet</button><label>Öğrenci fiyatı<input name="studentPrice" type="number" min="0" step="0.01" value="45" required></label><label>Personel fiyatı<input name="staffPrice" type="number" min="0" step="0.01" value="70" required></label><span class="muted-line">Yemekleri seçin</span><span class="muted-line">Değişiklik hemen yayınlanır.</span><div class="check-grid wide">${dishes.map((d) => `<label class="check-item"><input type="checkbox" name="dishIds" value="${d.id}">${safe(d.name)} <span class="muted-line">${safe(d.category)}</span></label>`).join("")}</div></form></section><section class="panel"><div class="panel-head"><h3>Menü doluluğu ve puanlar</h3></div><div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Yemekhane</th><th>Öğün</th><th>Doluluk</th><th>Boş yer</th><th>Ortalama puan</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  $("#menu-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const dishIds = form.getAll("dishIds");
    if (!dishIds.length) {
      toast("En az bir yemek seçin.", true);
      return;
    }
    const body = Object.fromEntries(
      ["canteenId", "date", "mealId", "studentPrice", "staffPrice"].map(
        (key) => [key, form.get(key)],
      ),
    );
    body.dishIds = dishIds;
    try {
      const result = await api("/admin/menus", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      toast(result.message);
      renderAdmin();
    } catch (error) {
      toast(error.message, true);
    }
  };
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  try {
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    state.user = result.user;
    showApp();
  } catch (error) {
    toast(error.message, true);
  }
});
$("#main-nav").addEventListener("click", (e) => {
  const button = e.target.closest("[data-page]");
  if (button) navigate(button.dataset.page);
});
$("#logout").addEventListener("click", async () => {
  await api("/auth/logout", { method: "POST" }).catch(() => {});
  state.user = null;
  showLogin();
});
$("#mobile-menu").addEventListener("click", () =>
  $(".sidebar").classList.toggle("open"),
);
document.addEventListener("click", (e) => {
  if (e.target.closest(".text-button[data-page]"))
    navigate(e.target.closest("[data-page]").dataset.page);
});
api("/session")
  .then((data) => {
    if (data.user) {
      state.user = data.user;
      showApp();
    } else showLogin();
  })
  .catch(() => showLogin());
