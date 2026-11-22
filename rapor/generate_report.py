from datetime import date
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

OUT = 'rapor/yemekhane-otomasyonu-raporu.pdf'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
pdfmetrics.registerFont(TTFont('ArialTR', FONT))
pdfmetrics.registerFont(TTFont('ArialTR-Bold', BOLD))
GREEN = colors.HexColor('#2C4E37')
MINT = colors.HexColor('#E8F0E6')
PAPER = colors.HexColor('#F8F9F5')
INK = colors.HexColor('#26332B')
MUTED = colors.HexColor('#6F7B71')
ORANGE = colors.HexColor('#B36B3E')
RED = colors.HexColor('#A34840')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', fontName='ArialTR-Bold', fontSize=31, leading=36, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle(name='Deck', fontName='ArialTR', fontSize=13, leading=19, textColor=MUTED, spaceAfter=12))
styles.add(ParagraphStyle(name='H1TR', fontName='ArialTR-Bold', fontSize=21, leading=26, textColor=INK, spaceBefore=2, spaceAfter=10))
styles.add(ParagraphStyle(name='H2TR', fontName='ArialTR-Bold', fontSize=12, leading=16, textColor=GREEN, spaceBefore=9, spaceAfter=5))
styles.add(ParagraphStyle(name='BodyTR', fontName='ArialTR', fontSize=9.4, leading=14, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name='SmallTR', fontName='ArialTR', fontSize=8, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name='CellTR', fontName='ArialTR', fontSize=8.4, leading=12, textColor=INK))
styles.add(ParagraphStyle(name='CellBoldTR', fontName='ArialTR-Bold', fontSize=8.4, leading=12, textColor=INK))
styles.add(ParagraphStyle(name='LabelTR', fontName='ArialTR-Bold', fontSize=8, leading=11, textColor=GREEN, uppercase=True))
styles.add(ParagraphStyle(name='CalloutTR', fontName='ArialTR-Bold', fontSize=9, leading=14, textColor=RED))
styles.add(ParagraphStyle(name='CenterTR', fontName='ArialTR-Bold', fontSize=9, leading=12, textColor=GREEN, alignment=TA_CENTER))

def P(text, style='BodyTR'):
    return Paragraph(text, styles[style])

def table(rows, widths, header=True):
    t=Table(rows, colWidths=widths, hAlign='LEFT', repeatRows=1 if header else 0)
    commands=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#E2E6DE'))]
    if header: commands += [('BACKGROUND',(0,0),(-1,0),MINT),('TEXTCOLOR',(0,0),(-1,0),GREEN)]
    t.setStyle(TableStyle(commands)); return t

def page(canvas, doc):
    canvas.saveState(); w,h=A4
    canvas.setFillColor(GREEN); canvas.rect(0,h-8*mm,w,8*mm,fill=1,stroke=0)
    canvas.setFont('ArialTR',7.5); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm,10*mm,'KAMPÜS SOFRASI  ·  TEKNİK RAPOR')
    canvas.drawRightString(w-18*mm,10*mm,f'{doc.page}')
    canvas.restoreState()

doc=SimpleDocTemplate(OUT,pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=17*mm,bottomMargin=18*mm,title='Kampüs Sofrası - Yemekhane Otomasyonu Teknik Raporu',author='Web Teknolojileri')
story=[]
# Page 1
story += [Spacer(1,14*mm),P('WEB TEKNOLOJİLERİ  /  DÖNEM ÖDEVİ','LabelTR'),Spacer(1,7*mm),P('Kampüs<br/>Sofrası','CoverTitle'),P('Yemekhane menüsü, rezervasyon ve bakiye yönetimi','Deck'),Spacer(1,3*mm)]
story += [table([[P('PROJE','LabelTR'),P('MİMARİ','LabelTR'),P('KAPSAM','LabelTR')],[P('Kampüs yemekhanesi otomasyonu','CellBoldTR'),P('Web API + Apache statik arayüz','CellTR'),P('Compose · MySQL replika · Redis','CellTR')]], [55*mm,65*mm,54*mm], header=False),Spacer(1,9*mm),P('Genel bakış','H2TR'),P('Bu depo, ödev PDF’sinde tanımlanan başlangıç paketi klasörde bulunmadığı için altyapıyı, örnek veriyi ve web uygulamasını birlikte içerir. Apache tarayıcıya HTML5/CSS3/JavaScript sunar; Node.js/Express API veriyi ayrı servis katmanından yönetir. MySQL kaynak sunucu yazmaları, replikası listeleme ve rapor okumalarını taşır. Redis menü önbelleğini ve 30 dakikalık oturumları saklar.'),Spacer(1,2*mm)]
arch=[[P('Tarayıcı','CenterTR'),P('Apache :8080','CenterTR'),P('Express API','CenterTR')],[P('HTML · CSS · fetch','SmallTR'),P('/api → proxy','SmallTR'),P('Controller → service','SmallTR')],[P('','SmallTR'),P('','SmallTR'),P('','SmallTR')]]
arch_t=Table(arch,colWidths=[57*mm,57*mm,57*mm],rowHeights=[10*mm,9*mm,2*mm])
arch_t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PAPER),('BOX',(0,0),(-1,-1),.8,colors.HexColor('#D8E1D5')),('INNERGRID',(0,0),(-1,-1),.5,colors.HexColor('#D8E1D5')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(0,0),(-1,-1),'CENTER')]))
story += [arch_t,Spacer(1,2*mm),table([[P('MySQL primary<br/><font size="7">yazma · procedure</font>','CenterTR'),P('MySQL replica<br/><font size="7">salt okunur · okuma</font>','CenterTR'),P('Redis<br/><font size="7">menü · oturum</font>','CenterTR')]], [57*mm,57*mm,57*mm], header=False),Spacer(1,6*mm),P('Kapsam özeti','H2TR'),P('12 temel tablo, 3 view, 4 stored procedure; 30 kullanıcı, 52 yemek, 84 menü ve 365 örnek rezervasyon. Uygulama ekranları: giriş, menü/hafta, rezervasyonlar, bakiye, değerlendirme, alerjen profili ve yönetici paneli. Dördüncü aşamada yarım porsiyon ve profil alerjenleri migration ile eklenir.'),Spacer(1,5*mm),P('Teslim notu','H2TR'),P('Rapor tarihi: 22 Kasım 2026. Ödev PDF’sindeki 10 Kasım 2026 teslim tarihi geçmiştir. Altı Compose servisi Docker üzerinde sağlıklı çalıştı; API, seed/migration, Redis ve source-replica doğrulamaları tamamlandı.','CalloutTR'),PageBreak()]
# Page 2
story += [P('01  /  Altyapı ve veritabanı','H1TR'),P('Compose ağı ve kalıcı depolama','H2TR'),P('Altı servis Compose ağı üzerinde konuşur. MySQL primary binlog + GTID ile çalışır; replica GTID auto-position ile source’a bağlanır, read-only açılır ve replika kurulum servisi başarıyla bittiğinde uygulama başlar. MySQL ve Redis verileri named volume’larda kalır. Veritabanları healthcheck ile beklenir.'),table([[P('Servis','CellBoldTR'),P('Sorumluluk','CellBoldTR'),P('Port','CellBoldTR')],[P('frontend','CellTR'),P('Apache 2.4, statik arayüz ve API proxy','CellTR'),P('8080','CellTR')],[P('application','CellTR'),P('Node/Express API, oturum ve iş kuralları','CellTR'),P('3000 iç ağ','CellTR')],[P('mysql-primary','CellTR'),P('Yazma ve stored procedure','CellTR'),P('3307','CellTR')],[P('mysql-replica','CellTR'),P('Okuma, salt okunur replika','CellTR'),P('3308','CellTR')],[P('replica-setup','CellTR'),P('GTID replikasyon bağlantısını kurar','CellTR'),P('—','CellTR')],[P('redis','CellTR'),P('Önbellek ve oturum deposu','CellTR'),P('6379','CellTR')]], [37*mm,112*mm,22*mm]),Spacer(1,3*mm),P('Veri modeli ve başlangıç verisi','H2TR'),P('Kullanıcı, yemekhane, öğün, kategori, yemek, alerjen, menü, rezervasyon, bakiye hareketi ve değerlendirme tabloları foreign key ve unique kısıtlarıyla bağlanır. Menü detay/doluluk/puan view’ları ekranları besler. Para hareketi prosedürleri transaction içinde çalışır; hata durumunda rollback yapıp Türkçe SQLSTATE 45000 mesajı döndürür.'),P('Çalıştırma ve kanıt toplama komutları','H2TR'),table([[P('Komut','CellBoldTR'),P('Beklenen doğrulama','CellBoldTR')],[P('<font name="ArialTR">docker compose up -d</font>','CellTR'),P('Altı servis başlar; application ve frontend healthy olur.','CellTR')],[P('<font name="ArialTR">docker compose ps</font>','CellTR'),P('MySQL, Redis, frontend ve API healthy; replica-setup exited 0.','CellTR')],[P('<font name="ArialTR">SHOW REPLICA STATUS\\G</font>','CellTR'),P('IO/SQL thread çalışır, source GTID takibi aktif.','CellTR')],[P('<font name="ArialTR">INSERT ... mysql-replica</font>','CellTR'),P('Yazma read-only nedeniyle reddedilir.','CellTR')]], [78*mm,93*mm]),Spacer(1,3*mm),P('Docker Compose temiz hacimlerde başlatıldı; MySQL 8.4 seed/migration sonrası 30 kullanıcı, 52 yemek, 84 menü ve 365 rezervasyon bulundu. Apache, API, Redis ve iki MySQL servisi healthy oldu; GTID replikası gecikmesiz çalıştı, read-only yazma denemesi reddedildi.','CalloutTR'),PageBreak()]
# Page 3
story += [P('02  /  Uygulama ve arayüz','H1TR'),P('Seçim: Web API + duyarlı arayüz','H2TR'),P('API yalnızca JSON döndürür. Tarayıcıda çerçevesiz HTML5, CSS3 ve JavaScript fetch kullanılır. Apache `/api/` isteklerini uygulama servisine iletir. Arayüz 400 px telefon genişliğinde tek kolon menü kartlarına, mobil açılır navigasyona ve yatay kaydırılan hafta seçicisine döner.'),table([[P('Ekran','CellBoldTR'),P('İşlev','CellBoldTR')],[P('Giriş / çıkış','CellTR'),P('E-posta ve bcrypt doğrulaması; Redis tabanlı oturum.','CellTR')],[P('Menü / haftalık plan','CellTR'),P('Yemekhane, gün ve öğün seçimi; yemek, kalori, vejetaryen, alerjen, kapasite ve role göre fiyat.','CellTR')],[P('Rezervasyonlarım','CellTR'),P('Aktif/kullanıldı/iptal durumu; uygun sürede iptal ve iade.','CellTR')],[P('Bakiye','CellTR'),P('Bakiye, yükleme ve son 50 hareket.','CellTR')],[P('Değerlendirme','CellTR'),P('Kullanılmış menüye 1–5 puan ve yorum.','CellTR')],[P('Alerjen profili','CellTR'),P('Alerjen tercihleri ve eşleşen yemeklerde uyarı.','CellTR')],[P('Yönetici paneli','CellTR'),P('Menü oluştur/düzenle, doluluk, puan ve turnike uçları.','CellTR')]], [47*mm,124*mm]),Spacer(1,4*mm),P('Örnek istek yolu','H2TR'),table([[P('1 · route','CellBoldTR'),P('2 · controller','CellBoldTR'),P('3 · veri katmanı','CellBoldTR'),P('4 · yanıt','CellBoldTR')],[P('POST /api/reservations','CellTR'),P('Oturum ve porsiyon doğrula','CellTR'),P('CALL sp_rezervasyon_yap(uid,menu,porsiyon) → primary','CellTR'),P('Yeni bakiye primary’den okunur','CellTR')]], [39*mm,42*mm,54*mm,36*mm]),Spacer(1,3*mm),P('Okuma/yazma kuralı','H2TR'),P('Listeleme, menü ve rapor okuması `mysql-replica` havuzunu kullanır. Bakiye yükleme, rezervasyon, iptal, değerlendirme ve yönetici menü yazımı `mysql-primary` bağlantısından geçer. Rezervasyondan hemen sonra gösterilen bakiye primary’den okunur; replikanın asenkron gecikmesi nedeniyle eski bakiye gösterilmesin diye bu özel okuma kaynağa yöneltilir.'),P('Demo hesapları','H2TR'),P('`ogrenci@kampus.edu`, `personel@kampus.edu`, `yonetici@kampus.edu` hesaplarının örnek parolası `password` olarak ayarlanmıştır. Bunlar yalnızca yerel demo verisidir.'),PageBreak()]
# Page 4
story += [P('03–04  /  Redis ve değişiklik migration’ı','H1TR'),P('Redis kullanımı','H2TR'),table([[P('Kullanım','CellBoldTR'),P('Anahtar / ömür','CellBoldTR'),P('Geçersizleştirme','CellBoldTR')],[P('Menü cache','CellTR'),P('menu:{yemekhane_id}:{tarih}:{ogun_id}; yerel gün sonuna kadar','CellTR'),P('Yönetici menü kaydında ilgili güne ait anahtarlar silinir; yeni içerik primary’den cache’e yazılır.','CellTR')],[P('Oturum','CellTR'),P('oturum:{token}; 30 dakika, her istekte yenilenir','CellTR'),P('Çıkışta Redis session kaydı kaldırılır; uygulama yeniden başlasa da oturum korunur.','CellTR')]], [34*mm,62*mm,75*mm]),Spacer(1,4*mm),P('Değişiklik talebi ve migration','H2TR'),P('`db/migrations/04_degisiklik.sql` eski rezervasyonlara varsayılan `tam` değeriyle yeni `porsiyon` sütununu ekler ve `kullanici_alerjenleri` tablosunu yaratır. Stored procedure üç argüman alır; öğle/akşam yarım porsiyon ücretini tam fiyatın %60’ına yuvarlar, kahvaltıda reddeder. İptal edilmiş rezervasyon aynı unique kayıt üzerinden yeniden etkinleştirilebilir. Bu migration mevcut rezervasyonları silmez.'),P('Mevcut çalışan veritabanında migration tek kez uygulanmalıdır. Yeni kurulumda ilk seed tamamlandıktan sonra init script migration’ı uygular. Sonrasında replikaya GTID ile aktarılır. Replika doğrulaması için `SHOW CREATE TABLE yemekhane.rezervasyonlar\\G` kullanılır. Menü değişikliğinden sonra eski Redis anahtarları temizlenir.'),P('Gerçekleştirilen kod doğrulamaları','H2TR'),table([[P('Kontrol','CellBoldTR'),P('Sonuç','CellBoldTR')],[P('Node testleri','CellTR'),P('10 test geçti: stored procedure hata eşleme, bcrypt, Compose, şema/migration ve yazma sonrası primary’den okuma.','CellTR')],[P('JavaScript / shell syntax','CellTR'),P('API, server, frontend ve iki shell betiğinde `node --check` / `bash -n` geçti.','CellTR')],[P('MySQL 8.4 seed + migration','CellTR'),P('MySQL 8.4: kullanıcı/yemek/menü/rezervasyon = 30/52/84/365; migration sonrası 365 eski kayıt tam porsiyon, bakiye-ledger farkı 0.','CellTR')],[P('API + Redis entegrasyonu','CellTR'),P('9 akış geçti: giriş, menü cache hit, yarım fiyat, iade/yeniden rezervasyon, bakiye, alerjen, turnike/değerlendirme, yönetici cache yenileme, çıkış. Session app restart sonrası korundu.','CellTR')],[P('Compose source-replica','CellTR'),P('Docker Compose: altı servis sağlıklı; GTID replikası aktif, gecikme 0, I/O ve SQL işçileri çalışıyor. Replika super_read_only=1; UPDATE MySQL 1290 ile reddedildi.','CellTR')]], [52*mm,119*mm]),Spacer(1,5*mm),P('Teslim öncesi kalan doğrulama','H2TR'),P('Docker Compose web/API uçtan uca çalıştırıldı; Apache üzerinden /health ve arayüz HTTP 200 döndürdü, 9 entegrasyon akışı geçti. Ödeme sağlayıcısı kapsam dışıdır; bakiye yükleme yerel demonstrasyondur.' ,'CalloutTR')]

doc.build(story,onFirstPage=page,onLaterPages=page)
print(OUT)
