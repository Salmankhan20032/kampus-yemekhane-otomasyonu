USE yemekhane;
CREATE TABLE kullanicilar (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, ad_soyad VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE, sifre_hash VARCHAR(100) NOT NULL,
 rol ENUM('ogrenci','personel','yonetici') NOT NULL DEFAULT 'ogrenci',
 ogrenci_no VARCHAR(30) UNIQUE, bakiye DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (bakiye >= 0),
 aktif BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CHECK ((rol='ogrenci' AND ogrenci_no IS NOT NULL) OR (rol<>'ogrenci' AND ogrenci_no IS NULL))
);
CREATE TABLE yemekhaneler (
 id INT PRIMARY KEY AUTO_INCREMENT, ad VARCHAR(100) NOT NULL, kapasite INT NOT NULL CHECK (kapasite > 0)
);
CREATE TABLE ogunler (
 id INT PRIMARY KEY AUTO_INCREMENT, ad VARCHAR(40) NOT NULL,
 rezervasyon_son_saati TIME NOT NULL, UNIQUE(ad)
);
CREATE TABLE yemek_kategorileri (
 id INT PRIMARY KEY AUTO_INCREMENT, ad VARCHAR(80) NOT NULL, sira INT NOT NULL DEFAULT 0
);
CREATE TABLE yemekler (
 id INT PRIMARY KEY AUTO_INCREMENT, kategori_id INT NOT NULL, ad VARCHAR(120) NOT NULL,
 kalori INT NOT NULL DEFAULT 0 CHECK (kalori >= 0), vejetaryen BOOLEAN NOT NULL DEFAULT FALSE,
 FOREIGN KEY (kategori_id) REFERENCES yemek_kategorileri(id)
);
CREATE TABLE alerjenler (
 id INT PRIMARY KEY AUTO_INCREMENT, ad VARCHAR(80) NOT NULL UNIQUE
);
CREATE TABLE yemek_alerjenleri (
 yemek_id INT NOT NULL, alerjen_id INT NOT NULL, PRIMARY KEY(yemek_id, alerjen_id),
 FOREIGN KEY(yemek_id) REFERENCES yemekler(id) ON DELETE CASCADE,
 FOREIGN KEY(alerjen_id) REFERENCES alerjenler(id)
);
CREATE TABLE menuler (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, yemekhane_id INT NOT NULL, tarih DATE NOT NULL, ogun_id INT NOT NULL,
 ogrenci_fiyati DECIMAL(8,2) NOT NULL, personel_fiyati DECIMAL(8,2) NOT NULL,
 UNIQUE(yemekhane_id,tarih,ogun_id), FOREIGN KEY(yemekhane_id) REFERENCES yemekhaneler(id),
 FOREIGN KEY(ogun_id) REFERENCES ogunler(id)
);
CREATE TABLE menu_yemekleri (
 menu_id BIGINT NOT NULL, yemek_id INT NOT NULL, PRIMARY KEY(menu_id,yemek_id),
 FOREIGN KEY(menu_id) REFERENCES menuler(id) ON DELETE CASCADE,
 FOREIGN KEY(yemek_id) REFERENCES yemekler(id)
);
CREATE TABLE rezervasyonlar (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, kullanici_id BIGINT NOT NULL, menu_id BIGINT NOT NULL,
 durum ENUM('aktif','kullanildi','iptal') NOT NULL DEFAULT 'aktif', tutar DECIMAL(8,2) NOT NULL,
 olusturma_zamani TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(kullanici_id,menu_id), FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id),
 FOREIGN KEY(menu_id) REFERENCES menuler(id)
);
CREATE TABLE bakiye_hareketleri (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, kullanici_id BIGINT NOT NULL,
 tur ENUM('yukleme','rezervasyon','iade') NOT NULL, tutar DECIMAL(10,2) NOT NULL,
 aciklama VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id), INDEX(kullanici_id,created_at)
);
CREATE TABLE degerlendirmeler (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, kullanici_id BIGINT NOT NULL, menu_id BIGINT NOT NULL,
 puan TINYINT NOT NULL CHECK (puan BETWEEN 1 AND 5), yorum VARCHAR(1000),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(kullanici_id,menu_id), FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id),
 FOREIGN KEY(menu_id) REFERENCES menuler(id)
);
CREATE OR REPLACE VIEW v_menu_detay AS
 SELECT m.id menu_id,m.yemekhane_id,m.tarih,m.ogun_id,og.ad ogun,m.ogrenci_fiyati,m.personel_fiyati,
        y.id yemek_id,y.ad yemek,y.kalori,y.vejetaryen,k.ad kategori,k.sira kategori_sira,
        GROUP_CONCAT(DISTINCT a.ad ORDER BY a.ad SEPARATOR ', ') alerjenler
 FROM menuler m JOIN ogunler og ON og.id=m.ogun_id
 JOIN menu_yemekleri my ON my.menu_id=m.id JOIN yemekler y ON y.id=my.yemek_id
 JOIN yemek_kategorileri k ON k.id=y.kategori_id
 LEFT JOIN yemek_alerjenleri ya ON ya.yemek_id=y.id LEFT JOIN alerjenler a ON a.id=ya.alerjen_id
 GROUP BY m.id,y.id,k.id,og.id;
CREATE OR REPLACE VIEW v_menu_doluluk AS
 SELECT m.id menu_id,m.yemekhane_id,m.tarih,m.ogun_id,y.kapasite,
  COUNT(CASE WHEN r.durum='aktif' THEN 1 END) dolu,
  y.kapasite-COUNT(CASE WHEN r.durum='aktif' THEN 1 END) bos
 FROM menuler m JOIN yemekhaneler y ON y.id=m.yemekhane_id
 LEFT JOIN rezervasyonlar r ON r.menu_id=m.id GROUP BY m.id,y.kapasite;
CREATE OR REPLACE VIEW v_menu_puan AS
 SELECT m.id menu_id,COALESCE(ROUND(AVG(d.puan),2),0) ortalama_puan,COUNT(d.id) oy_sayisi
 FROM menuler m LEFT JOIN degerlendirmeler d ON d.menu_id=m.id GROUP BY m.id;
DELIMITER $$
CREATE PROCEDURE sp_bakiye_yukle(IN p_uid BIGINT, IN p_tutar DECIMAL(10,2))
BEGIN
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 IF p_tutar<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Yükleme tutarı pozitif olmalıdır.'; END IF;
 UPDATE kullanicilar SET bakiye=bakiye+p_tutar WHERE id=p_uid AND aktif=TRUE;
 IF ROW_COUNT()=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Kullanıcı bulunamadı.'; END IF;
 INSERT INTO bakiye_hareketleri(kullanici_id,tur,tutar,aciklama) VALUES(p_uid,'yukleme',p_tutar,'Bakiye yükleme');
 COMMIT;
END$$
CREATE PROCEDURE sp_rezervasyon_yap(IN p_uid BIGINT, IN p_menu BIGINT)
BEGIN
 DECLARE v_fiyat DECIMAL(8,2); DECLARE v_rol VARCHAR(20); DECLARE v_bakiye DECIMAL(10,2);
 DECLARE v_kapasite INT; DECLARE v_dolu INT; DECLARE v_son TIME; DECLARE v_ogun INT;
 DECLARE v_missing BOOLEAN DEFAULT FALSE;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_missing=TRUE;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT rol,bakiye INTO v_rol,v_bakiye FROM kullanicilar WHERE id=p_uid AND aktif=TRUE FOR UPDATE;
 IF v_missing OR v_rol IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Kullanıcı bulunamadı.'; END IF;
 SET v_missing=FALSE;
 SELECT IF(v_rol='ogrenci',m.ogrenci_fiyati,m.personel_fiyati),y.kapasite,
  (SELECT COUNT(*) FROM rezervasyonlar r WHERE r.menu_id=m.id AND r.durum='aktif'),o.rezervasyon_son_saati,m.ogun_id
 INTO v_fiyat,v_kapasite,v_dolu,v_son,v_ogun FROM menuler m JOIN yemekhaneler y ON y.id=m.yemekhane_id
 JOIN ogunler o ON o.id=m.ogun_id WHERE m.id=p_menu AND m.tarih>=CURDATE() FOR UPDATE;
 IF v_missing OR v_fiyat IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Menü bulunamadı veya tarihi geçti.'; END IF;
 IF CURRENT_TIME()>v_son AND (SELECT tarih=CURDATE() FROM menuler WHERE id=p_menu) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Rezervasyon süresi doldu.'; END IF;
 IF v_dolu>=v_kapasite THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Menüde boş yer kalmadı.'; END IF;
 IF v_bakiye<v_fiyat THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Bakiye yetersiz.'; END IF;
 IF EXISTS(SELECT 1 FROM rezervasyonlar WHERE kullanici_id=p_uid AND menu_id=p_menu AND durum<>'iptal') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Bu menü için rezervasyonunuz zaten var.'; END IF;
 INSERT INTO rezervasyonlar(kullanici_id,menu_id,tutar) VALUES(p_uid,p_menu,v_fiyat);
 UPDATE kullanicilar SET bakiye=bakiye-v_fiyat WHERE id=p_uid;
 INSERT INTO bakiye_hareketleri(kullanici_id,tur,tutar,aciklama) VALUES(p_uid,'rezervasyon',-v_fiyat,CONCAT('Menü #',p_menu));
 COMMIT;
END$$
CREATE PROCEDURE sp_rezervasyon_iptal(IN p_uid BIGINT, IN p_rid BIGINT)
BEGIN
 DECLARE v_tutar DECIMAL(8,2); DECLARE v_menu BIGINT;
 DECLARE v_missing BOOLEAN DEFAULT FALSE;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_missing=TRUE;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT r.tutar,r.menu_id INTO v_tutar,v_menu FROM rezervasyonlar r JOIN menuler m ON m.id=r.menu_id
 WHERE r.id=p_rid AND r.kullanici_id=p_uid AND r.durum='aktif' AND (m.tarih>CURDATE() OR
 (m.tarih=CURDATE() AND CURRENT_TIME()<(SELECT rezervasyon_son_saati FROM ogunler WHERE id=m.ogun_id))) FOR UPDATE;
 IF v_missing OR v_tutar IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Rezervasyon bulunamadı veya iptal süresi doldu.'; END IF;
 UPDATE rezervasyonlar SET durum='iptal' WHERE id=p_rid;
 UPDATE kullanicilar SET bakiye=bakiye+v_tutar WHERE id=p_uid;
 INSERT INTO bakiye_hareketleri(kullanici_id,tur,tutar,aciklama) VALUES(p_uid,'iade',v_tutar,CONCAT('Rezervasyon #',p_rid,' iadesi'));
 COMMIT;
END$$
CREATE PROCEDURE sp_turnike_gecis(IN p_uid BIGINT, IN p_menu BIGINT)
BEGIN
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 UPDATE rezervasyonlar SET durum='kullanildi' WHERE kullanici_id=p_uid AND menu_id=p_menu AND durum='aktif';
 IF ROW_COUNT()=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Aktif rezervasyon bulunamadı.'; END IF;
 COMMIT;
END$$
DELIMITER ;
