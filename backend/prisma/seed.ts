import { PrismaClient, UserType, OnayDurumu, DefterDurumu, SaglikSigortasiDurumu } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed işlemi başlıyor...');

  // Test kullanıcısı oluştur veya güncelle
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Admin kullanıcısı oluştur
  const admin = await prisma.user.upsert({
    where: { tcKimlik: '99999999999' },
    update: {
      password: hashedPassword,
    },
    create: {
      tcKimlik: '99999999999',
      kullaniciAdi: 'admin',
      name: 'administraktör',
      email: 'admin@stajkontrol.com',
      password: hashedPassword,
      userType: UserType.YONETICI,
      studentId: null,
      faculty: null,
      class: null
    }
  });

  // Kariyer merkezi kullanıcısı oluştur
  const careerCenter = await prisma.user.upsert({
    where: { tcKimlik: '98765432109' },
    update: {
      password: hashedPassword,
    },
    create: {
      tcKimlik: '98765432109',
      kullaniciAdi: 'kariyer', // Kariyer merkezi için email
      name: 'Kariyer Merkezi',
      email: 'kariyer@test.com',
      password: hashedPassword,
      userType: UserType.KARIYER_MERKEZI,
      studentId: null,
      faculty: null,
      class: null
    }
  });

  console.log('✅ Kariyer merkezi kullanıcısı oluşturuldu/güncellendi:', careerCenter.email);

  // Yönetici kullanıcısı güncelle (zaten yukarıda oluşturduk)
  console.log('✅ Yönetici kullanıcısı güncellendi:', admin.email);
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });