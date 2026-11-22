USE yemekhane;
INSERT INTO yemekhaneler(ad,kapasite) VALUES ('Merkez Yemekhane',400),('Mühendislik Yemekhane',60);
INSERT INTO ogunler(ad,rezervasyon_son_saati) VALUES ('Kahvaltı','07:00:00'),('Öğle','10:00:00'),('Akşam','15:00:00');
INSERT INTO yemek_kategorileri(ad,sira) VALUES ('Çorba',1),('Ana yemek',2),('Yardımcı yemek',3),('Salata',4),('Tatlı',5),('İçecek',6),('Ek',7);
INSERT INTO alerjenler(ad) VALUES ('Gluten'),('Süt'),('Yumurta'),('Fıstık'),('Soya'),('Balık'),('Kabuklu deniz ürünü'),('Susam'),('Hardal'),('Kereviz'),('Hardal tohumu'),('Badem'),('Ceviz'),('Mantar');
INSERT INTO yemekler(kategori_id,ad,kalori,vejetaryen) VALUES
(1,'Mercimek çorbası',160,1),(1,'Ezogelin çorbası',145,1),(1,'Yayla çorbası',130,1),(1,'Domates çorbası',120,1),
(2,'Izgara tavuk',320,0),(2,'Etli nohut',390,0),(2,'Sebzeli türlü',240,1),(2,'Fırında köfte',410,0),
(3,'Pirinç pilavı',280,1),(3,'Bulgur pilavı',240,1),(3,'Makarna',310,1),(3,'Patates püresi',210,1),
(4,'Mevsim salata',80,1),(4,'Yoğurtlu semizotu',110,1),(4,'Çoban salata',75,1),
(5,'Sütlaç',220,1),(5,'Mevsim meyvesi',90,1),(5,'Revani',300,1),
(6,'Ayran',95,1),(6,'Su',0,1),(6,'Komposto',110,1),
(7,'Turşu',25,1),(7,'Ekmek',130,1),(7,'Zeytinyağlı fasulye',190,1),
(1,'Tarhana çorbası',155,1),(1,'Sebze çorbası',115,1),(1,'Tavuk suyu çorbası',175,0),(1,'Düğün çorbası',180,0),
(2,'Fırın tavuk',340,0),(2,'Kuru fasulye',365,1),(2,'Izgara sebze tabağı',230,1),(2,'Dana sote',430,0),
(2,'Zeytinyağlı enginar',205,1),(2,'Hindi rosto',355,0),(2,'Sebzeli güveç',260,1),(2,'Balık fileto',390,0),
(3,'Şehriyeli pirinç pilavı',295,1),(3,'Fırın makarna',345,1),(3,'Bulgur salatası',220,1),(3,'Sebzeli kuskus',275,1),
(4,'Gavurdağı salatası',120,1),(4,'Havuç tarator',145,1),(4,'Roka salatası',65,1),(4,'Piyaz',180,1),
(5,'Kazandibi',255,1),(5,'Elma',80,1),(5,'Portakal',75,1),(5,'İrmik helvası',320,1),
(6,'Şekersiz limonata',70,1),(6,'Maden suyu',0,1),(6,'Elma kompostosu',125,1),(6,'Bitki çayı',2,1);
INSERT INTO yemek_alerjenleri(yemek_id,alerjen_id) VALUES (3,2),(11,1),(14,2),(16,2),(18,1),(19,2),(22,8),(23,1);
INSERT INTO kullanicilar(ad_soyad,email,sifre_hash,rol,ogrenci_no,bakiye) VALUES
('Demo Öğrenci','ogrenci@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20260001',500),
('Demo Personel','personel@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','personel',NULL,750),
('Demo Yönetici','yonetici@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','yonetici',NULL,1000);
INSERT INTO kullanicilar(ad_soyad,email,sifre_hash,rol,ogrenci_no,bakiye) VALUES
('Öğrenci 04','ogrenci04@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261004',5000),
('Öğrenci 05','ogrenci05@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261005',5000),
('Öğrenci 06','ogrenci06@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261006',5000),
('Öğrenci 07','ogrenci07@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261007',5000),
('Öğrenci 08','ogrenci08@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261008',5000),
('Öğrenci 09','ogrenci09@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261009',5000),
('Öğrenci 10','ogrenci10@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261010',5000),
('Öğrenci 11','ogrenci11@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261011',5000),
('Öğrenci 12','ogrenci12@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261012',5000),
('Öğrenci 13','ogrenci13@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261013',5000),
('Öğrenci 14','ogrenci14@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261014',5000),
('Öğrenci 15','ogrenci15@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261015',5000),
('Öğrenci 16','ogrenci16@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261016',5000),
('Öğrenci 17','ogrenci17@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261017',5000),
('Öğrenci 18','ogrenci18@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261018',5000),
('Öğrenci 19','ogrenci19@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261019',5000),
('Öğrenci 20','ogrenci20@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261020',5000),
('Öğrenci 21','ogrenci21@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261021',5000),
('Öğrenci 22','ogrenci22@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261022',5000),
('Öğrenci 23','ogrenci23@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261023',5000),
('Öğrenci 24','ogrenci24@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261024',5000),
('Öğrenci 25','ogrenci25@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261025',5000),
('Öğrenci 26','ogrenci26@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261026',5000),
('Öğrenci 27','ogrenci27@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261027',5000),
('Öğrenci 28','ogrenci28@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261028',5000),
('Öğrenci 29','ogrenci29@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261029',5000),
('Öğrenci 30','ogrenci30@kampus.edu','$2a$10$7Bx55uU3W6/yYF1jxuznUeAzKue/y9a./czCbvJ3rVDN9xvUr1TLi','ogrenci','20261030',5000);
INSERT INTO menuler(yemekhane_id,tarih,ogun_id,ogrenci_fiyati,personel_fiyati)
SELECT h.id,CURDATE()+INTERVAL d.gun DAY,o.id,IF(o.id=1,25,45),IF(o.id=1,40,70)
FROM yemekhaneler h JOIN ogunler o JOIN (SELECT 0 gun UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13) d;
INSERT INTO menu_yemekleri(menu_id,yemek_id)
SELECT m.id, e.yemek_id FROM menuler m JOIN (
 SELECT 1 ogun_id,1 yemek_id UNION ALL SELECT 1,9 UNION ALL SELECT 1,13 UNION ALL SELECT 1,19 UNION ALL
 SELECT 2,2 UNION ALL SELECT 2,5 UNION ALL SELECT 2,10 UNION ALL SELECT 2,15 UNION ALL SELECT 2,17 UNION ALL SELECT 2,19 UNION ALL
 SELECT 3,4 UNION ALL SELECT 3,8 UNION ALL SELECT 3,12 UNION ALL SELECT 3,14 UNION ALL SELECT 3,16 UNION ALL SELECT 3,20
) e ON e.ogun_id=m.ogun_id;
INSERT INTO bakiye_hareketleri(kullanici_id,tur,tutar,aciklama) VALUES (1,'yukleme',500,'Açılış bakiyesi');
INSERT INTO bakiye_hareketleri(kullanici_id,tur,tutar,aciklama) VALUES (2,'yukleme',750,'Açılış bakiyesi'),(3,'yukleme',1000,'Açılış bakiyesi');
INSERT INTO bakiye_hareketleri(kullanici_id,tur,tutar,aciklama) SELECT id,'yukleme',5000,'Açılış bakiyesi' FROM kullanicilar WHERE id>=4;
DELIMITER $$
CREATE PROCEDURE seed_demo_reservations()
BEGIN
 DECLARE n INT DEFAULT 0; DECLARE v_menu BIGINT; DECLARE v_offset INT;
 WHILE n<365 DO
  SET v_offset=MOD(n,78);
  SELECT id INTO v_menu FROM menuler WHERE tarih>CURDATE() ORDER BY id LIMIT v_offset,1;
  CALL sp_rezervasyon_yap(4+FLOOR(n/78),v_menu);
  SET n=n+1;
 END WHILE;
END$$
CALL seed_demo_reservations()$$
DROP PROCEDURE seed_demo_reservations$$
DELIMITER ;
