USE yemekhane;
ALTER TABLE rezervasyonlar
  ADD COLUMN porsiyon ENUM('tam','yari') NOT NULL DEFAULT 'tam' AFTER tutar;
CREATE TABLE IF NOT EXISTS kullanici_alerjenleri (
  kullanici_id BIGINT NOT NULL,
  alerjen_id INT NOT NULL,
  PRIMARY KEY(kullanici_id,alerjen_id),
  FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id) ON DELETE CASCADE,
  FOREIGN KEY(alerjen_id) REFERENCES alerjenler(id) ON DELETE CASCADE
);
DROP PROCEDURE IF EXISTS sp_rezervasyon_yap;
DELIMITER $$
CREATE PROCEDURE sp_rezervasyon_yap(IN p_uid BIGINT, IN p_menu BIGINT, IN p_porsiyon VARCHAR(10))
BEGIN
 DECLARE v_fiyat DECIMAL(8,2); DECLARE v_rol VARCHAR(20); DECLARE v_bakiye DECIMAL(10,2);
 DECLARE v_kapasite INT; DECLARE v_dolu INT; DECLARE v_son TIME; DECLARE v_ogun INT;
 DECLARE v_missing BOOLEAN DEFAULT FALSE;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_missing=TRUE;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT rol,bakiye INTO v_rol,v_bakiye FROM kullanicilar WHERE id=p_uid AND aktif=TRUE FOR UPDATE;
 IF v_missing OR v_rol IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Kullanıcı bulunamadı.'; END IF;
 IF p_porsiyon NOT IN ('tam','yari') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Porsiyon seçimi geçersiz.'; END IF;
 SET v_missing=FALSE;
 SELECT IF(v_rol='ogrenci',m.ogrenci_fiyati,m.personel_fiyati),y.kapasite,
  (SELECT COUNT(*) FROM rezervasyonlar r WHERE r.menu_id=m.id AND r.durum='aktif'),o.rezervasyon_son_saati,m.ogun_id
 INTO v_fiyat,v_kapasite,v_dolu,v_son,v_ogun FROM menuler m JOIN yemekhaneler y ON y.id=m.yemekhane_id
 JOIN ogunler o ON o.id=m.ogun_id WHERE m.id=p_menu AND m.tarih>=CURDATE() FOR UPDATE;
 IF v_missing OR v_fiyat IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Menü bulunamadı veya tarihi geçti.'; END IF;
 IF p_porsiyon='yari' AND v_ogun=1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Kahvaltıda yarım porsiyon seçilemez.'; END IF;
 IF p_porsiyon='yari' THEN SET v_fiyat=ROUND(v_fiyat*0.60,2); END IF;
 IF CURRENT_TIME()>v_son AND (SELECT tarih=CURDATE() FROM menuler WHERE id=p_menu) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Rezervasyon süresi doldu.'; END IF;
 IF v_dolu>=v_kapasite THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Menüde boş yer kalmadı.'; END IF;
 IF v_bakiye<v_fiyat THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Bakiye yetersiz.'; END IF;
 IF EXISTS(SELECT 1 FROM rezervasyonlar WHERE kullanici_id=p_uid AND menu_id=p_menu AND durum<>'iptal') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Bu menü için rezervasyonunuz zaten var.'; END IF;
 IF EXISTS(SELECT 1 FROM rezervasyonlar WHERE kullanici_id=p_uid AND menu_id=p_menu AND durum='iptal') THEN
  UPDATE rezervasyonlar SET durum='aktif',tutar=v_fiyat,porsiyon=p_porsiyon,olusturma_zamani=CURRENT_TIMESTAMP
   WHERE kullanici_id=p_uid AND menu_id=p_menu;
 ELSE
  INSERT INTO rezervasyonlar(kullanici_id,menu_id,tutar,porsiyon) VALUES(p_uid,p_menu,v_fiyat,p_porsiyon);
 END IF;
 UPDATE kullanicilar SET bakiye=bakiye-v_fiyat WHERE id=p_uid;
 INSERT INTO bakiye_hareketleri(kullanici_id,tur,tutar,aciklama) VALUES(p_uid,'rezervasyon',-v_fiyat,CONCAT('Menü #',p_menu,' (',p_porsiyon,')'));
 COMMIT;
END$$
DELIMITER ;
