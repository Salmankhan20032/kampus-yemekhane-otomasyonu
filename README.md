# Kampüs Sofrası

Kampüs yemekhanesi menüsü, rezervasyon, bakiye, değerlendirme ve alerjen tercihi uygulaması. Arayüz Apache'den, JSON API Node/Express MVC uygulamasından sunulur. Proje kökünde `docker compose up -d` tüm sistemi başlatır; web arayüzü `http://localhost:8080` adresindedir.

> Bu çalışma klasöründe ödev PDF'si dışında başlangıç paketi bulunmadığı için Compose altyapısı, örnek veri ve uygulama burada oluşturulmuştur. MySQL 8.4, Redis ve API akışları bu makinede birlikte doğrulandı. Docker Engine kurulu olmadığından Compose container'ları ve gerçek source-replica replikasyonu burada çalıştırılamadı.

## Başlatma

1. Docker Desktop veya Docker Engine + Compose v2 kurun.
2. İsterseniz `.env.example` dosyasını `.env` olarak kopyalayıp yerel parolaları değiştirin. Varsayılan ayarlarla ek dosya oluşturmadan da başlayabilirsiniz.
3. `docker compose up -d` çalıştırın. Compose ilk açılışta uygulama imajını otomatik derler.
4. `http://localhost:8080` adresini açın.

Örnek hesaplar (parola: `password`):

| Rol      | E-posta               |
| -------- | --------------------- |
| Öğrenci  | `ogrenci@kampus.edu`  |
| Personel | `personel@kampus.edu` |
| Yönetici | `yonetici@kampus.edu` |

Yeni veritabanı ilk açılışta `db/init/` SQL dosyalarını sırayla çalıştırır. Replika GTID auto-position ile kurulur. Yeniden başlatma verileri korur. Baştan kurmak için `docker compose down -v` volume'ları siler ve tüm demo verisini yeniden oluşturur.

## Servisler

| Servis          | Görev                                            | Yerel port |
| --------------- | ------------------------------------------------ | ---------- |
| `frontend`      | Apache 2.4, HTML/CSS/JS; `/api/` proxy           | 8080       |
| `application`   | Node.js / Express JSON API, iş kuralları         | iç ağ 3000 |
| `mysql-primary` | Yazmalar, migration ve stored procedure'ler      | 3307       |
| `mysql-replica` | Salt okunur liste/rapor sorguları                | 3308       |
| `replica-setup` | Kaynak-replika GTID bağlantısını bir kez ayarlar | —          |
| `redis`         | Menü önbelleği ve oturum deposu                  | 6379       |

Uygulama veri erişimini `src/services.js` ve `src/db.js` içinde ayırır. `read()` yalnızca replikaya; yazma, transaction ve procedure çağrıları kaynağa gider. Rezervasyon sonrası bakiye güncel gösterim için özellikle kaynaktan okunur; asenkron replikasyonun kısa gecikmesi eski bakiye göstermemelidir.

## Ekranlar ve işlevler

- E-posta / bcrypt parola girişi, çıkış ve Redis'te 30 dakikalık yenilenen oturum.
- Yemekhane ve yedi günlük tarih seçimi; öğün, kategori, kalori, vejetaryen ve alerjen bilgileri.
- Rol bazlı ücret, kapasite ve rezervasyon saati denetimi; öğle/akşam %60 fiyatlı yarım porsiyon.
- Rezervasyon listesi, uygun olduğunda iptal ve otomatik iade.
- Bakiye yükleme ve hareket geçmişi.
- Kullanılmış rezervasyonlara puan/yorum.
- Yönetici menü düzenleme, doluluk ve ortalama puan ekranı.
- Profil alerjenleri; eşleşen yemeklerde görünür uyarı.

Seed verisi ödevde verilen ölçeğe yakındır: 30 kullanıcı, 52 yemek, 84 menü ve 365 rezervasyon.

Para hareketleri `sp_rezervasyon_yap`, `sp_rezervasyon_iptal`, `sp_bakiye_yukle` ve `sp_turnike_gecis` yordamlarından geçer. SQLSTATE 45000 mesajları kullanıcıya taşınır. Menü detayları `menu:{yemekhane_id}:{tarih}:{ogun_id}` anahtarıyla gün sonuna dek saklanır, yönetici değişikliği ilgili tarih/yemekhane anahtarlarını siler. Oturum anahtarı Connect Redis tarafından `oturum:` önekiyle saklanır.

## Aşama 4 migration

`db/migrations/04_degisiklik.sql`, mevcut rezervasyonları `tam` varsayılanıyla koruyarak porsiyon sütununu ekler; kullanıcı-alerjen ilişkisini oluşturur ve üç parametreli `sp_rezervasyon_yap` yordamını değiştirir. Yeni kurulumda migration otomatik uygulanır. Çalışan bir sisteme elle uygulamak için:

```sh
docker compose exec -T mysql-primary sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" yemekhane' < db/migrations/04_degisiklik.sql
docker compose exec mysql-replica sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW CREATE TABLE yemekhane.rezervasyonlar\G"'
```

Çalışan veritabanına birden fazla kez elle uygulama desteklenmez; migration'ı yalnızca bir kez uygulayın. `docker-entrypoint-initdb.d` dosyaları mevcut volume'da yeniden çalışmadığından, mevcut kurulumu güncellerken yukarıdaki komut kullanılmalıdır.

## Doğrulama

```sh
npm ci
npm test
npx prettier --check package.json docker-compose.yml src frontend tests README.md
node --check src/app.js
node --check src/services.js
node --check frontend/app.js
docker compose config
docker compose ps
```

Replikasyon kontrolleri:

```sh
docker compose exec mysql-primary sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW MASTER STATUS\G"'
docker compose exec mysql-replica sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW REPLICA STATUS\G"'
docker compose exec mysql-replica sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT COUNT(*) FROM yemekhane.menuler"'
docker compose exec mysql-replica sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE TABLE yemekhane.replica_write_test(id INT)"'
```

Son komut `read-only` nedeniyle hata vermelidir. Gerçek çıktı ve ekran görüntülerini doğrulama sonrasında `rapor/` klasörüne ekleyin. PDF rapor aşama kanıtlarını içermelidir; Docker erişimi olmadan burada uydurma container çıktısı eklenmemiştir.

Yerel entegrasyon denemesinde MySQL okuma/yazma havuzları aynı MySQL 8.4 kaynağına bağlandı; login, menü cache hit, yarım porsiyon ve iade, yeniden rezervasyon, bakiye yükleme, alerjen profili, turnike/değerlendirme, yönetici menü cache yenilemesi, çıkış ve API yeniden başlatmasından sonra Redis oturumunun korunması doğrulandı. Bu deneme source-replica davranışını kanıtlamaz.

## Bilinen kapsam notları

- Bakiye yükleme dönem ödevi demonstrasyonu için ödeme sağlayıcısı olmadan yapılır.
- Demo parolaları ve `.env` varsayılanları yalnızca yerel geliştirme içindir. Yayında güçlü sırlar, HTTPS ve yedekleme yapılandırılmalıdır.
- Ödevin 10 Kasım 2026 teslim tarihi geçmiş durumda; teslim platformundaki geç teslim kuralını kontrol edin.
