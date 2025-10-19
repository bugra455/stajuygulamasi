import { PrismaClient, UserType, OnayDurumu, DefterDurumu, SaglikSigortasiDurumu, StajTipi } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Demo veri için yardımcı fonksiyonlar
const generateRandomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateRandomTC = () => {
  return Math.floor(10000000000 + Math.random() * 90000000000).toString();
};

const generateRandomStudentId = () => {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
};

const generateRandomEmail = (name: string) => {
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`;
};

const generateRandomPhone = () => {
  const prefixes = ['0505', '0506', '0507', '0532', '0533', '0534', '0535', '0536', '0537', '0538', '0539'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}${number}`;
};

const stajKurumlari = [
  'Google Türkiye',
  'Microsoft Türkiye',
  'Amazon Web Services',
  'Netflix Türkiye',
  'Spotify Türkiye',
  'Uber Türkiye',
  'Getir',
  'Trendyol',
  'Hepsiburada',
  'N11',
  'Turkcell',
  'Vodafone Türkiye',
  'Turk Telekom',
  'Garanti BBVA',
  'İş Bankası',
  'Yapı Kredi',
  'Akbank',
  'Denizbank',
  'Türk Hava Yolları',
  'Pegasus',
  'Turkish Airlines',
  'Borusan Holding',
  'Koç Holding',
  'Sabancı Holding',
  'Doğuş Holding',
  'Eczacıbaşı Holding',
  'Vestel',
  'Arçelik',
  'Beko',
  'Aselsan',
  'Roketsan',
  'TUSAŞ'
];

const stajTipleri: StajTipi[] = [
  StajTipi.ZORUNLU_STAJ,
  StajTipi.ISTEGE_BAGLI_STAJ,
  StajTipi.IMU_402,
  StajTipi.IMU_404,
  StajTipi.MESLEKI_EGITIM_UYGULAMALI_DERS
];

const fakulteler = [
  'Bilgisayar Mühendisliği',
  'Elektrik-Elektronik Mühendisliği',
  'Endüstri Mühendisliği',
  'Makine Mühendisliği',
  'İnşaat Mühendisliği',
  'Kimya Mühendisliği',
  'Gıda Mühendisliği',
  'Çevre Mühendisliği',
  'Petrol ve Doğalgaz Mühendisliği',
  'Maden Mühendisliği',
  'Jeoloji Mühendisliği',
  'Harita Mühendisliği',
  'İşletme Mühendisliği',
  'Sistem Mühendisliği',
  'Yazılım Mühendisliği'
];

const siniflar = ['1', '2', '3', '4'];

const ogrenciIsimleri = [
  'Ahmet Yılmaz', 'Ayşe Demir', 'Mehmet Kaya', 'Fatma Özkan', 'Ali Çelik',
  'Zeynep Arslan', 'Mustafa Şahin', 'Elif Yıldız', 'Hasan Özdemir', 'Selin Korkmaz',
  'Emre Aydın', 'Büşra Özkan', 'Can Yılmaz', 'Deniz Demir', 'Ege Kaya',
  'Feyza Özkan', 'Gökhan Çelik', 'Havva Arslan', 'İbrahim Şahin', 'Jale Yıldız',
  'Kemal Özdemir', 'Leyla Korkmaz', 'Murat Aydın', 'Nur Özkan', 'Ozan Yılmaz',
  'Pınar Demir', 'Rıza Kaya', 'Seda Özkan', 'Tolga Çelik', 'Ufuk Arslan',
  'Vildan Şahin', 'Yasin Yıldız', 'Zehra Özdemir', 'Arda Korkmaz', 'Beren Aydın',
  'Cem Özkan', 'Derya Yılmaz', 'Eren Demir', 'Fırat Kaya', 'Gamze Özkan',
  'Hakan Çelik', 'İrem Arslan', 'Jülide Şahin', 'Kaan Yıldız', 'Lara Özdemir',
  'Mert Korkmaz', 'Naz Aydın', 'Onur Özkan', 'Pamir Yılmaz', 'Rana Demir',
  'Sarp Kaya', 'Tuğçe Özkan', 'Umut Çelik', 'Veda Arslan', 'Yağız Şahin',
  'Zara Yıldız', 'Alp Özdemir', 'Bade Korkmaz', 'Ceren Aydın', 'Deniz Özkan',
  'Ece Yılmaz', 'Ferhat Demir', 'Gizem Kaya', 'Hüseyin Özkan', 'İlke Çelik',
  'Jade Arslan', 'Koray Şahin', 'Lina Yıldız', 'Mert Özdemir', 'Nida Korkmaz',
  'Oğuz Aydın', 'Pelin Özkan', 'Rüzgar Yılmaz', 'Selin Demir', 'Taha Kaya',
  'Ulaş Özkan', 'Vuslat Çelik', 'Yaren Arslan', 'Zeki Şahin', 'Ada Yıldız',
  'Baran Özdemir', 'Ceyda Korkmaz', 'Doruk Aydın', 'Eylül Özkan', 'Fırat Yılmaz',
  'Gül Demir', 'Hakan Kaya', 'İpek Özkan', 'Jade Çelik', 'Kaan Arslan',
  'Leyla Şahin', 'Mert Yıldız', 'Naz Özdemir', 'Ozan Korkmaz', 'Pınar Aydın',
  'Rıza Özkan', 'Seda Yılmaz', 'Tolga Demir', 'Ufuk Kaya', 'Vildan Özkan',
  'Yasin Çelik', 'Zehra Arslan', 'Arda Şahin', 'Beren Yıldız', 'Cem Özdemir',
  'Derya Korkmaz', 'Eren Aydın', 'Fırat Özkan', 'Gamze Yılmaz', 'Hakan Demir',
  'İrem Kaya', 'Jülide Özkan', 'Kaan Çelik', 'Lara Arslan', 'Mert Şahin',
  'Naz Yıldız', 'Onur Özdemir', 'Pamir Korkmaz', 'Rana Aydın', 'Sarp Özkan',
  'Tuğçe Yılmaz', 'Umut Demir', 'Veda Kaya', 'Yağız Özkan', 'Zara Çelik'
];

const danismanIsimleri = [
  'Dr. Ahmet Yılmaz', 'Dr. Ayşe Demir', 'Dr. Mehmet Kaya', 'Dr. Fatma Özkan',
  'Dr. Ali Çelik', 'Dr. Zeynep Arslan', 'Dr. Mustafa Şahin', 'Dr. Elif Yıldız',
  'Dr. Hasan Özdemir', 'Dr. Selin Korkmaz', 'Dr. Emre Aydın', 'Dr. Büşra Özkan',
  'Dr. Can Yılmaz', 'Dr. Deniz Demir', 'Dr. Ege Kaya', 'Dr. Feyza Özkan',
  'Dr. Gökhan Çelik', 'Dr. Havva Arslan', 'Dr. İbrahim Şahin', 'Dr. Jale Yıldız'
];

async function main() {
  console.log('Genişletilmiş demo veri seti oluşturuluyor...');

  // Mevcut verileri temizle
  console.log('Mevcut veriler temizleniyor...');
  await prisma.stajDefteri.deleteMany();
  await prisma.stajBasvurusu.deleteMany();
  await prisma.user.deleteMany();

  // Danışman kullanıcıları oluştur
  console.log('Danışman kullanıcıları oluşturuluyor...');
  const danismanlar: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  const hashedPassword = await bcrypt.hash('123456', 10);

  for (let i = 0; i < 5; i++) {
    const email = `danisman${i + 1}@university.edu.tr`;
    const danisman = await prisma.user.create({
      data: {
        tcKimlik: generateRandomTC(),
        kullaniciAdi: email, // Danışman için email
        name: danismanIsimleri[i],
        email: email,
        password: hashedPassword,
        userType: UserType.DANISMAN
      }
    });
    danismanlar.push(danisman);
    console.log(`✅ Danışman oluşturuldu: ${danisman.name} (${danisman.email})`);
  }

  // Kariyer Merkezi kullanıcısı oluştur
  const kariyerEmail = 'kariyer@university.edu.tr';
  const kariyerMerkeziUser = await prisma.user.create({
    data: {
      tcKimlik: '11111111111',
      kullaniciAdi: kariyerEmail, // Kariyer merkezi için email
      name: 'Kariyer Merkezi Demo',
      email: kariyerEmail,
      password: hashedPassword,
      userType: UserType.KARIYER_MERKEZI
    }
  });
  console.log(`✅ Kariyer Merkezi kullanıcısı oluşturuldu: ${kariyerMerkeziUser.email} (Parola: 123456)`);

  // Öğrenci kullanıcıları oluştur
  console.log('Öğrenci kullanıcıları oluşturuluyor...');
  const ogrenciler: Awaited<ReturnType<typeof prisma.user.create>>[] = [];

  for (let i = 0; i < 100; i++) {
    const studentId = generateRandomStudentId();
    // Her öğrenciye rastgele bir danışman ata
    const randomDanisman = danismanlar[Math.floor(Math.random() * danismanlar.length)];
    
    const ogrenci = await prisma.user.create({
      data: {
        tcKimlik: generateRandomTC(),
        kullaniciAdi: studentId, // Öğrenci için okul numarası
        name: ogrenciIsimleri[i],
        email: generateRandomEmail(ogrenciIsimleri[i]),
        password: hashedPassword,
        userType: UserType.OGRENCI,
        studentId: studentId,
        faculty: fakulteler[Math.floor(Math.random() * fakulteler.length)],
        class: siniflar[Math.floor(Math.random() * siniflar.length)],
        danismanId: randomDanisman.id // Rastgele danışman ataması
      }
    });
    ogrenciler.push(ogrenci);
  }
  console.log(`✅ ${ogrenciler.length} öğrenci oluşturuldu`);

  // Staj başvuruları oluştur
  console.log('Staj başvuruları oluşturuluyor...');
  const basvurular: Awaited<ReturnType<typeof prisma.stajBasvurusu.create>>[] = [];

  for (let i = 0; i < 150; i++) {
    const ogrenci = ogrenciler[Math.floor(Math.random() * ogrenciler.length)];
    const danisman = danismanlar[Math.floor(Math.random() * danismanlar.length)];
    
    // Rastgele tarihler oluştur
    const bugun = new Date();
    const stajBaslangic = new Date(bugun);
    stajBaslangic.setDate(bugun.getDate() + Math.floor(Math.random() * 180) + 30); // 30-210 gün sonra
    
    const stajBitis = new Date(stajBaslangic);
    stajBitis.setDate(stajBaslangic.getDate() + Math.floor(Math.random() * 60) + 30); // 30-90 gün sürüyor

    // Rastgele onay durumu
    const onayDurumlari = [
      OnayDurumu.HOCA_ONAYI_BEKLIYOR,
      OnayDurumu.KARIYER_MERKEZI_ONAYI_BEKLIYOR,
      OnayDurumu.SIRKET_ONAYI_BEKLIYOR,
      OnayDurumu.ONAYLANDI,
      OnayDurumu.REDDEDILDI
    ];
    const onayDurumu = onayDurumlari[Math.floor(Math.random() * onayDurumlari.length)];

    const basvuru = await prisma.stajBasvurusu.create({
      data: {
        ogrenciId: ogrenci.id,
        kurumAdi: stajKurumlari[Math.floor(Math.random() * stajKurumlari.length)],
        kurumAdresi: 'İstanbul, Türkiye',
        sorumluTelefon: generateRandomPhone(),
        sorumluMail: `sorumlu@${stajKurumlari[Math.floor(Math.random() * stajKurumlari.length)].toLowerCase().replace(/\s+/g, '')}.com`,
        yetkiliAdi: `${ogrenciIsimleri[Math.floor(Math.random() * ogrenciIsimleri.length)]} Yetkili`,
        yetkiliUnvani: 'Yazılım Geliştirme Müdürü',
        stajTipi: stajTipleri[Math.floor(Math.random() * stajTipleri.length)],
        baslangicTarihi: stajBaslangic,
        bitisTarihi: stajBitis,
        seciliGunler: '1,2,3,4,5', // Pazartesi-Cuma
        toplamGun: Math.floor(Math.random() * 60) + 30, // 30-90 gün
        saglikSigortasiDurumu: Math.random() > 0.5 ? SaglikSigortasiDurumu.ALIYORUM : SaglikSigortasiDurumu.ALMIYORUM,
        danismanMail: danisman.email ?? '',
        transkriptDosyasi: 'uploads/transcript_demo.pdf',
        onayDurumu: onayDurumu
      }
    });
    basvurular.push(basvuru);

    // Onaylandı başvurular için staj defteri oluştur
    if (onayDurumu === OnayDurumu.ONAYLANDI) {
      // Rastgele defter durumu: BEKLEMEDE, SIRKET_ONAYI_BEKLIYOR, SIRKET_REDDETTI, DANISMAN_ONAYI_BEKLIYOR, DANISMAN_REDDETTI, ONAYLANDI, REDDEDILDI
      const defterDurumlari = [
        DefterDurumu.BEKLEMEDE,
        DefterDurumu.SIRKET_ONAYI_BEKLIYOR,
        DefterDurumu.SIRKET_REDDETTI,
        DefterDurumu.DANISMAN_ONAYI_BEKLIYOR,
        DefterDurumu.DANISMAN_REDDETTI,
        DefterDurumu.ONAYLANDI,
        DefterDurumu.REDDEDILDI
      ];
      const defterDurumu = defterDurumlari[Math.floor(Math.random() * defterDurumlari.length)];

      const defter = await prisma.stajDefteri.create({
        data: {
          stajBasvurusuId: basvuru.id,
          defterDurumu: defterDurumu,
          dosyaYolu: defterDurumu === DefterDurumu.BEKLEMEDE ? null : 'uploads/demo_defter.pdf',
          originalFileName: defterDurumu === DefterDurumu.BEKLEMEDE ? null : 'staj_defteri_demo.pdf',
          fileSize: defterDurumu === DefterDurumu.BEKLEMEDE ? null : Math.floor(Math.random() * 5000000) + 1000000, // 1-6 MB
          uploadDate: defterDurumu === DefterDurumu.BEKLEMEDE ? null : generateRandomDate(new Date(2024, 0, 1), new Date())
        }
      });

      // Defter oluşturuldu
    }

    // Demo logları kaldırıldı - MongoDB'de tutulacak
  }

  console.log(`✅ ${basvurular.length} staj başvurusu oluşturuldu`);

  // İstatistikler
  const hocaOnayiBekleyen = basvurular.filter(b => b.onayDurumu === OnayDurumu.HOCA_ONAYI_BEKLIYOR).length;
  const kariyerMerkeziBekleyen = basvurular.filter(b => b.onayDurumu === OnayDurumu.KARIYER_MERKEZI_ONAYI_BEKLIYOR).length;
  const sirketBekleyen = basvurular.filter(b => b.onayDurumu === OnayDurumu.SIRKET_ONAYI_BEKLIYOR).length;
  const onaylanan = basvurular.filter(b => b.onayDurumu === OnayDurumu.ONAYLANDI).length;
  const reddedilen = basvurular.filter(b => b.onayDurumu === OnayDurumu.REDDEDILDI).length;

  console.log('\n📊 Demo Veri İstatistikleri:');
  console.log(`🏫 Danışman Sayısı: ${danismanlar.length}`);
  console.log(`🏫 Öğrenci Sayısı: ${ogrenciler.length}`);
  console.log(`🏫 Toplam Başvuru: ${basvurular.length}`);
  console.log(`⏳ Danışman Onayı Bekleyen: ${hocaOnayiBekleyen}`);
  console.log(`📋 Kariyer Merkezi Bekleyen: ${kariyerMerkeziBekleyen}`);
  console.log(`🏢 Şirket Bekleyen: ${sirketBekleyen}`);
  console.log(`✅ Onaylanan: ${onaylanan}`);
  console.log(`❌ Reddedilen: ${reddedilen}`);

  console.log('\n🔑 Giriş Bilgileri:');
  console.log('Danışman Hesapları:');
  danismanlar.forEach((danisman, index) => {
    console.log(`   ${index + 1}. ${danisman.email} (Parola: 123456)`);
  });

  console.log('\n📧 Öğrenci Hesapları (İlk 5):');
  ogrenciler.slice(0, 5).forEach((ogrenci, index) => {
    console.log(`   ${index + 1}. ${ogrenci.email} (Parola: 123456)`);
  });

  console.log('\n🎯 Test Senaryoları:');
  console.log('1. Danışman hesabıyla giriş yapın');
  console.log('2. Öğrenciler sekmesinde öğrenci listesini görün');
  console.log('3. Başvurular sekmesinde onay bekleyen başvuruları görün');
  console.log('4. Defterler sekmesinde yüklenen defterleri görün');
  console.log('5. Onay/red işlemlerini test edin');

  console.log('\nDemo veri seti başarıyla oluşturuldu!');
}

main()
  .catch((e) => {
    console.error('❌ Demo seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });