import { prisma } from '../lib/prisma.js';
import { UserType } from '../generated/prisma/index.js';
import { Prisma } from '@prisma/client';
import { QueryBuilder, UserQueryFilters } from '../types/common.types.js';
import LoggerService, { LogAction } from './logger.service.js';
import LogModel from '../models/log.model.js';

export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      userType: true,
      studentId: true,
      faculty: true,
      class: true,
    }
  });
}

export async function getAllDanismanlar() {
  return prisma.user.findMany({
    where: { userType: 'DANISMAN' },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      kullaniciAdi: true
    }
  });
}

export async function getAllOgrenciler() {
  return prisma.user.findMany({
    where: { userType: 'OGRENCI' },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      studentId: true,
      tcKimlik: true,
      kullaniciAdi: true,
      faculty: true,
      class: true,
    }
  });
}

// Şirketler ayrı bir model olarak yok, başvurulardan unique şirketler çekilir
export async function getAllSirketler() {
  // Şirket bilgileri StajBasvurusu modelinde tutuluyor
  const sirketler = await prisma.stajBasvurusu.findMany({
    distinct: ['kurumAdi'],
    select: {
      kurumAdi: true,
      kurumAdresi: true,
      yetkiliAdi: true,
      yetkiliUnvani: true,
      sorumluMail: true,
      sorumluTelefon: true,
    },
    orderBy: { kurumAdi: 'asc' },
  });
  return sirketler;
}


export async function updateUser(id: number, data: Record<string, unknown>) {
  return prisma.user.update({
    where: { id },
    data: data as never, // Type assertion for now, can be improved with specific interfaces
  });
}

// Detaylı öğrenci bilgisi (başvuru sayısı, evraklar dahil)
export async function getOgrenciDetay(ogrenciId: number) {
  const ogrenci = await prisma.user.findUnique({
    where: { id: ogrenciId, userType: 'OGRENCI' },
    select: {
      id: true,
      kullaniciAdi: true,
      name: true,
      email: true,
      studentId: true,
      faculty: true,
      class: true,
      tcKimlik: true,
      createdAt: true,
      capOgrenci: {
        select: {
          capFakulte: true,
          capBolum: true,
          capDepartman: true,
        }
      },
      basvurular: {
        include: {
          defter: {
            select: {
              id: true,
              dosyaYolu: true,
              originalFileName: true,
              fileSize: true,
              uploadDate: true,
              defterDurumu: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!ogrenci) return null;

  return {
    ...ogrenci,
    isCapOgrenci: !!ogrenci.capOgrenci,
    capFakulte: ogrenci.capOgrenci?.capFakulte,
    capBolum: ogrenci.capOgrenci?.capBolum,
    capDepartman: ogrenci.capOgrenci?.capDepartman,
    basvuruSayisi: ogrenci.basvurular.length,
    aktifBasvurular: ogrenci.basvurular.filter(b => b.onayDurumu !== 'REDDEDILDI' && b.onayDurumu !== 'IPTAL_EDILDI').length,
    tamamlananBasvurular: ogrenci.basvurular.filter(b => b.onayDurumu === 'ONAYLANDI').length,
  };
}

// Detaylı danışman bilgisi
export async function getDanismanDetay(danismanId: number) {
  const danisman = await prisma.user.findUnique({
    where: { id: danismanId, userType: 'DANISMAN' },
    select: {
      id: true,
      kullaniciAdi: true,
      name: true,
      email: true,
      createdAt: true,
    }
  });

  if (!danisman) return null;

  // Danışmanın onayladığı başvuru sayısını MongoDB'den hesapla
  let onayladiCount = 0;
  let reddettiCount = 0;
  
  try {
    const onayladiResult = await LogModel.countDocuments({
      userId: danismanId,
      action: LogAction.HOCA_ONAYLADI
    });
    
    const reddettiResult = await LogModel.countDocuments({
      userId: danismanId,
      action: LogAction.HOCA_REDDETTI
    });
    
    onayladiCount = onayladiResult;
    reddettiCount = reddettiResult;
  } catch (error) {
    console.warn('MongoDB log istatistikleri alınamadı:', error);
    // Hata durumunda 0 değerlerini kullan
  }

  return {
    ...danisman,
    onayladiBasvuruSayisi: onayladiCount,
    reddettiBasvuruSayisi: reddettiCount,
    toplamIncelediBasvuru: onayladiCount + reddettiCount,
  };
}

// Şirket detayı (o şirkete giden öğrenci sayısı)
export async function getSirketDetay(kurumAdi: string) {
  const basvurular = await prisma.stajBasvurusu.findMany({
    where: { kurumAdi },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          faculty: true,
          class: true
        }
      },
      defter: {
        select: {
          id: true,
          defterDurumu: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (basvurular.length === 0) return null;

  const sirketBilgisi = basvurular[0];
  const toplamOgrenci = new Set(basvurular.map(b => b.ogrenciId)).size;
  const aktifStajlar = basvurular.filter(b => b.onayDurumu === 'ONAYLANDI').length;
  const bekleyenOnaylar = basvurular.filter(b => 
    b.onayDurumu === 'HOCA_ONAYI_BEKLIYOR' || 
    b.onayDurumu === 'KARIYER_MERKEZI_ONAYI_BEKLIYOR' ||
    b.onayDurumu === 'SIRKET_ONAYI_BEKLIYOR'
  ).length;

  return {
    kurumAdi: sirketBilgisi.kurumAdi,
    kurumAdresi: sirketBilgisi.kurumAdresi,
    yetkiliAdi: sirketBilgisi.yetkiliAdi,
    yetkiliUnvani: sirketBilgisi.yetkiliUnvani,
    sorumluMail: sirketBilgisi.sorumluMail,
    sorumluTelefon: sirketBilgisi.sorumluTelefon,
    danismanMail: sirketBilgisi.danismanMail, // Danışman email'i ekledik
    toplamOgrenciSayisi: toplamOgrenci,
    aktifStajSayisi: aktifStajlar,
    bekleyenBasvuruSayisi: bekleyenOnaylar,
    basvurular: basvurular.map(basvuru => ({
      id: basvuru.id,
      ogrenci: {
        id: basvuru.ogrenci.id,
        name: basvuru.ogrenci.name,
        email: basvuru.ogrenci.email,
        studentId: basvuru.ogrenci.studentId,
        faculty: basvuru.ogrenci.faculty || 'Bilgi bulunamadı', // Null check
        class: basvuru.ogrenci.class || 'Bilgi bulunamadı' // Null check ve class field
      },
      baslangicTarihi: basvuru.baslangicTarihi,
      bitisTarihi: basvuru.bitisTarihi,
      toplamGun: basvuru.toplamGun, // Toplam gün bilgisi ekledik
      onayDurumu: basvuru.onayDurumu,
      stajTipi: basvuru.stajTipi,
      defterDurumu: basvuru.defter?.defterDurumu || 'BEKLEMEDE',
      transkriptDosyasi: basvuru.transkriptDosyasi, // Transkript dosya yolu ekledik
      createdAt: basvuru.createdAt
    }))
  };
}

// Arama ve filtreleme fonksiyonları
export async function searchOgrenciler(searchTerm: string, faculty?: string, classFilter?: string) {
  const whereClause: QueryBuilder = {
    userType: 'OGRENCI',
    OR: [
      { name: { contains: searchTerm } },
      { email: { contains: searchTerm } },
      { studentId: { contains: searchTerm } },
      { tcKimlik: { contains: searchTerm } }
    ]
  };

  if (faculty) {
    whereClause.faculty = { contains: faculty };
  }

  if (classFilter) {
    whereClause.class = { contains: classFilter };
  }

  return prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      studentId: true,
      tcKimlik: true,
      faculty: true,
      class: true,
      _count: {
        select: { basvurular: true }
      }
    },
    orderBy: { name: 'asc' }
  });
}

export async function searchDanismanlar(searchTerm: string) {
  return prisma.user.findMany({
    where: {
      userType: 'DANISMAN',
      OR: [
        { name: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { tcKimlik: { contains: searchTerm } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' }
  });
}

export async function searchSirketler(searchTerm: string) {
  const basvurular = await prisma.stajBasvurusu.findMany({
    where: {
      OR: [
        { kurumAdi: { contains: searchTerm } },
        { kurumAdresi: { contains: searchTerm } },
        { yetkiliAdi: { contains: searchTerm } },
        { sorumluMail: { contains: searchTerm } },
        { sorumluTelefon: { contains: searchTerm } }
      ]
    },
    distinct: ['kurumAdi'],
    select: {
      kurumAdi: true,
      kurumAdresi: true,
      yetkiliAdi: true,
      yetkiliUnvani: true,
      sorumluMail: true,
      sorumluTelefon: true,
    },
    orderBy: { kurumAdi: 'asc' }
  });

  // Her şirket için başvuru sayısını hesapla - optimize with aggregation
  const [basvuruStats, aktifStajStats] = await Promise.all([
    prisma.stajBasvurusu.groupBy({
      by: ['kurumAdi'],
      _count: { id: true }
    }),
    prisma.stajBasvurusu.groupBy({
      by: ['kurumAdi'],
      where: { onayDurumu: 'ONAYLANDI' },
      _count: { id: true }
    })
  ]);

  // Create lookup maps for O(1) access
  const basvuruCountMap = new Map(basvuruStats.map(stat => [stat.kurumAdi, stat._count.id]));
  const aktifStajCountMap = new Map(aktifStajStats.map(stat => [stat.kurumAdi, stat._count.id]));

  const sirketlerWithStats = basvurular.map(sirket => {
    const basvuruSayisi = basvuruCountMap.get(sirket.kurumAdi) || 0;
    const aktifStajSayisi = aktifStajCountMap.get(sirket.kurumAdi) || 0;

    return {
      ...sirket,
      basvuruSayisi,
      aktifStajSayisi
    };
  });

  return sirketlerWithStats;
}

// Pagination destekli arama fonksiyonları
export async function searchKariyerOgrenciler(searchTerm?: string, faculty?: string, classFilter?: string, page: number = 1, pageSize: number = 100) {
  const where: QueryBuilder = {
    userType: 'OGRENCI'
  };

  if (searchTerm && searchTerm.trim()) {
    where.OR = [
      { name: { contains: searchTerm.trim() } },
      { email: { contains: searchTerm.trim() } },
      { studentId: { contains: searchTerm.trim() } },
      { kullaniciAdi: { contains: searchTerm.trim() } }
    ];
  }

  if (faculty) {
    where.faculty = faculty;
  }

  if (classFilter) {
    where.class = classFilter;
  }

  const [data, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        kullaniciAdi: true,
        faculty: true,
        class: true,
        _count: {
          select: { basvurular: true }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: 'asc' }
    }),
    prisma.user.count({ where })
  ]);

  return { data, totalCount };
}

export async function searchKariyerDanismanlar(searchTerm?: string, page: number = 1, pageSize: number = 100) {
  const where: QueryBuilder = {
    userType: 'DANISMAN'
  };

  if (searchTerm && searchTerm.trim()) {
    where.OR = [
      { name: { contains: searchTerm.trim() } },
      { email: { contains: searchTerm.trim() } },
      { kullaniciAdi: { contains: searchTerm.trim() } }
    ];
  }

  const [data, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        kullaniciAdi: true
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: 'asc' }
    }),
    prisma.user.count({ where })
  ]);

  return { data, totalCount };
}

export async function searchKariyerSirketler(searchTerm?: string, page: number = 1, pageSize: number = 100) {
  const where: QueryBuilder = {};

  if (searchTerm && searchTerm.trim()) {
    where.OR = [
      { kurumAdi: { contains: searchTerm.trim() } },
      { kurumAdresi: { contains: searchTerm.trim() } },
      { yetkiliAdi: { contains: searchTerm.trim() } },
      { sorumluMail: { contains: searchTerm.trim() } },
      { sorumluTelefon: { contains: searchTerm.trim() } }
    ];
  }

  // Tüm unique şirketleri bul
  const allUniqueSirketler = await prisma.stajBasvurusu.findMany({
    where,
    distinct: ['kurumAdi'],
    select: { kurumAdi: true },
  });
  const totalCount = allUniqueSirketler.length;

  // Sadece ilgili sayfadaki şirketleri getir
  const basvurular = await prisma.stajBasvurusu.findMany({
    where,
    distinct: ['kurumAdi'],
    select: {
      kurumAdi: true,
      kurumAdresi: true,
      yetkiliAdi: true,
      yetkiliUnvani: true,
      sorumluMail: true,
      sorumluTelefon: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { kurumAdi: 'asc' }
  });

  // Her şirket için başvuru sayısını hesapla - optimize with aggregation
  const [basvuruStats, aktifStajStats] = await Promise.all([
    prisma.stajBasvurusu.groupBy({
      by: ['kurumAdi'],
      _count: { id: true }
    }),
    prisma.stajBasvurusu.groupBy({
      by: ['kurumAdi'],
      where: { onayDurumu: 'ONAYLANDI' },
      _count: { id: true }
    })
  ]);

  // Create lookup maps for O(1) access
  const basvuruCountMap = new Map(basvuruStats.map(stat => [stat.kurumAdi, stat._count.id]));
  const aktifStajCountMap = new Map(aktifStajStats.map(stat => [stat.kurumAdi, stat._count.id]));

  const sirketlerWithStats = basvurular.map(sirket => {
    const basvuruSayisi = basvuruCountMap.get(sirket.kurumAdi) || 0;
    const aktifStajSayisi = aktifStajCountMap.get(sirket.kurumAdi) || 0;
    
    return {
      ...sirket,
      basvuruSayisi,
      aktifStajSayisi
    };
  });

  return { data: sirketlerWithStats, totalCount };
}
