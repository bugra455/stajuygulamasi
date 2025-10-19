import { PrismaClient, UserType, OnayDurumu, DefterDurumu, SaglikSigortasiDurumu, StajTipi } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Şirket onay testleri için veri oluşturuluyor...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // İki farklı öğrenci oluştur
  const student1 = await prisma.user.upsert({
    where: { tcKimlik: '11111111111' },
    update: {
      password: hashedPassword,
    },
    create: {
      tcKimlik: '11111111111',
      kullaniciAdi: '111111111',
      name: 'Ayşe Yılmaz',
      email: 'ayse.yilmaz@student.com',
      password: hashedPassword,
      userType: UserType.OGRENCI,
      studentId: '111111111',
      faculty: 'Bilgisayar Mühendisliği',
      class: '3'
    }
  });

  const student2 = await prisma.user.upsert({
    where: { tcKimlik: '22222222222' },
    update: {
      password: hashedPassword,
    },
    create: {
      tcKimlik: '22222222222',
      kullaniciAdi: '222222222',
      name: 'Mehmet Kaya',
      email: 'mehmet.kaya@student.com',
      password: hashedPassword,
      userType: UserType.OGRENCI,
      studentId: '222222222',
      faculty: 'Endüstri Mühendisliği',
      class: '4'
    }
  });

  console.log('✅ Test öğrencileri oluşturuldu');

  // Mevcut test verilerini temizle
  await prisma.stajDefteri.deleteMany({
    where: {
      stajBasvurusu: {
        ogrenciId: { in: [student1.id, student2.id] }
      }
    }
  });
  
  await prisma.stajBasvurusu.deleteMany({
    where: { ogrenciId: { in: [student1.id, student2.id] } }
  });

  // Tarihleri hesapla
  const bugun = new Date();
  const stajBaslangic1 = new Date(bugun);
  stajBaslangic1.setDate(bugun.getDate() + 7); // 1 hafta sonra başlıyor
  
  const stajBitis1 = new Date(stajBaslangic1);
  stajBitis1.setDate(stajBaslangic1.getDate() + 45); // 45 gün sürüyor

  const stajBaslangic2 = new Date(bugun);
  stajBaslangic2.setDate(bugun.getDate() - 30); // 30 gün önce başlamış
  
  const stajBitis2 = new Date(stajBaslangic2);
  stajBitis2.setDate(stajBaslangic2.getDate() + 60); // 60 gün sürüyor

  // 1. Şirket staj onayı bekleyen başvuru oluştur
  const stajOnayi = new Date();
  stajOnayi.setHours(stajOnayi.getHours() + 24); // 24 saat geçerli

  const basvuru1 = await prisma.stajBasvurusu.create({
    data: {
      ogrenciId: student1.id,
      kurumAdi: 'XYZ Yazılım A.Ş.',
      kurumAdresi: 'Maslak, Sarıyer, İstanbul',
      sorumluTelefon: '02123456789',
      sorumluMail: 'hr@xyzsoftware.com',
      yetkiliAdi: 'Zeynep Demir',
      yetkiliUnvani: 'İnsan Kaynakları Müdürü',
      stajTipi: StajTipi.ZORUNLU_STAJ,
      baslangicTarihi: stajBaslangic1,
      bitisTarihi: stajBitis1,
      seciliGunler: '1,2,3,4,5', // Pazartesi-Cuma
      toplamGun: 45,
      saglikSigortasiDurumu: SaglikSigortasiDurumu.ALIYORUM,
      danismanMail: 'danisman@university.edu.tr',
      transkriptDosyasi: 'uploads/transcript_ayse.pdf',
      sigortaDosyasi: 'uploads/insurance_ayse.pdf',
      hizmetDokumu: 'uploads/service_ayse.pdf',
      onayDurumu: OnayDurumu.SIRKET_ONAYI_BEKLIYOR,
      danismanOnayDurumu: 1, // Danışman onaylamış
      danismanAciklama: 'Öğrencinin başvurusu uygun, onaylıyorum.',
      kariyerMerkeziOnayDurumu: 1, // Kariyer merkezi onaylamış
      kariyerMerkeziAciklama: 'Kurum uygun, onaylıyorum.',
      sirketOtp: '123456', // Şirket giriş OTP'si
      sirketOtpExpires: stajOnayi // OTP geçerlilik süresi
    }
  });

  console.log('✅ Şirket staj onayı bekleyen başvuru oluşturuldu:', basvuru1.kurumAdi);
  console.log(`📧 Şirket email: ${basvuru1.sorumluMail}`);
  console.log(`🔑 Şirket OTP: ${basvuru1.sirketOtp}`);

  // 2. Şirket defter onayı bekleyen başvuru ve defter oluştur
  const defterOnayi = new Date();
  defterOnayi.setHours(defterOnayi.getHours() + 48); // 48 saat geçerli

  const basvuru2 = await prisma.stajBasvurusu.create({
    data: {
      ogrenciId: student2.id,
      kurumAdi: 'ABC Teknoloji Ltd.',
      kurumAdresi: 'Levent, Beşiktaş, İstanbul',
      sorumluTelefon: '02129876543',
      sorumluMail: 'staj@abctech.com',
      yetkiliAdi: 'Can Özkan',
      yetkiliUnvani: 'Teknik Direktör',
      stajTipi: StajTipi.IMU_402,
      baslangicTarihi: stajBaslangic2,
      bitisTarihi: stajBitis2,
      seciliGunler: '1,2,3,4,5', // Pazartesi-Cuma
      toplamGun: 60,
      saglikSigortasiDurumu: SaglikSigortasiDurumu.ALMIYORUM,
      danismanMail: 'danisman2@university.edu.tr',
      transkriptDosyasi: 'uploads/transcript_mehmet.pdf',
      onayDurumu: OnayDurumu.ONAYLANDI, // Başvuru tamamen onaylı
      danismanOnayDurumu: 1,
      danismanAciklama: 'Başvuru uygun, onaylıyorum.',
      kariyerMerkeziOnayDurumu: 1,
      kariyerMerkeziAciklama: 'Kurum uygun, onaylıyorum.',
      sirketOnayDurumu: 1,
      sirketAciklama: 'Öğrenciyi kabul ediyoruz.'
    }
  });

  // Defter oluştur (şirket onayı bekliyor)
  const defter = await prisma.stajDefteri.create({
    data: {
      stajBasvurusuId: basvuru2.id,
      defterDurumu: DefterDurumu.SIRKET_ONAYI_BEKLIYOR,
      dosyaYolu: 'uploads/staj_defteri_mehmet.pdf',
      originalFileName: 'mehmet_kaya_staj_defteri.pdf',
      fileSize: 2048000, // 2MB
      uploadDate: new Date(),
      sirketDefterOtp: '654321', // Şirket defter onay OTP'si
      sirketDefterOtpExpires: defterOnayi // OTP geçerlilik süresi
    }
  });

  console.log('✅ Şirket defter onayı bekleyen defter oluşturuldu');
  console.log(`📧 Şirket email: ${basvuru2.sorumluMail}`);
  console.log(`🔑 Şirket defter OTP: ${defter.sirketDefterOtp}`);

  console.log('\n🎉 Şirket onay test verileri oluşturuldu!');
  console.log('\n📋 Test Senaryoları:');
  console.log('\n1. Şirket Staj Onayı:');
  console.log(`   Email: ${basvuru1.sorumluMail}`);
  console.log(`   OTP: ${basvuru1.sirketOtp}`);
  console.log(`   URL: http://localhost:3000/sirket-giris`);
  console.log(`   Durum: ${basvuru1.onayDurumu}`);
  
  console.log('\n2. Şirket Defter Onayı:');
  console.log(`   Email: ${basvuru2.sorumluMail}`);
  console.log(`   OTP: ${defter.sirketDefterOtp}`);
  console.log(`   URL: http://localhost:3000/sirket-giris`);
  console.log(`   Durum: ${defter.defterDurumu}`);
}

main()
  .catch((e) => {
    console.error('❌ Şirket test verisi hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
