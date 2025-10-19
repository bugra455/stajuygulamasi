import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { OnayDurumu } from '../generated/prisma/index.js';
import { generateAndSendOtp } from '../controllers/sirket.controller.js';
import { BasvuruCreateData, BasvuruUpdateData, QueryBuilder } from '../types/common.types.js';
import fs from 'node:fs/promises';
import LoggerService, { LogAction, LogLevel } from './logger.service.js';

export async function getAllBasvurularByUserId(userId: number) {
  return prisma.stajBasvurusu.findMany({
    where: { ogrenciId: userId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getBasvuruById(basvuruId: number, userId: number) {
  return prisma.stajBasvurusu.findFirst({
    where: { id: basvuruId, ogrenciId: userId },
  });
}

export async function createBasvuru(data: BasvuruCreateData, userId: number, filePath: string) {
  // GMT+3 için tarihleri düzenle
  const processedData = { ...data };
  if (processedData.baslangicTarihi) {
    const baslangicDate = new Date(processedData.baslangicTarihi);
    baslangicDate.setHours(baslangicDate.getHours() + 3); // GMT+3 için +3 saat ekle
    processedData.baslangicTarihi = baslangicDate;
  }
  if (processedData.bitisTarihi) {
    const bitisDate = new Date(processedData.bitisTarihi);
    bitisDate.setHours(bitisDate.getHours() + 3); // GMT+3 için +3 saat ekle
    processedData.bitisTarihi = bitisDate;
  }

  const basvuru = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const yeniBasvuru = await tx.stajBasvurusu.create({
      data: {
        ...processedData,
        ogrenciId: userId,
        transkriptDosyasi: filePath,
        onayDurumu: OnayDurumu.HOCA_ONAYI_BEKLIYOR,
      },
    });

    // Log kaydı MongoDB'ye ekle
    const logger = LoggerService.getInstance();
    await logger.log(null, {
      action: LogAction.OLUSTURULDU,
      level: LogLevel.INFO,
      userId: userId,
      details: {
        action: 'basvuru_olusturuldu',
        basvuruId: yeniBasvuru.id,
        kurumAdi: processedData.kurumAdi,
        timestamp: new Date().toISOString()
      }
    });

    return yeniBasvuru;
  });

  return basvuru;
}

export async function cancelBasvuru(basvuruId: number, userId: number, iptalSebebi: string) {
  const basvuru = await getBasvuruById(basvuruId, userId);

  if (!basvuru) {
    throw { statusCode: 404, message: 'Başvuru bulunamadı veya bu başvuruya erişim yetkiniz yok.' };
  }

  if (basvuru.onayDurumu !== OnayDurumu.HOCA_ONAYI_BEKLIYOR) {
    throw { statusCode: 403, message: 'Sadece \'Danışman Onayı Bekliyor\' durumundaki başvurular iptal edilebilir.' };
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const guncellenmis = await tx.stajBasvurusu.update({
      where: { id: basvuruId },
      data: { onayDurumu: OnayDurumu.IPTAL_EDILDI, iptalSebebi },
    });

    // Log kaydı MongoDB'ye ekle
    const logger = LoggerService.getInstance();
    await logger.log(null, {
      action: LogAction.IPTAL_EDILDI,
      level: LogLevel.INFO,
      userId: userId,
      details: {
        action: 'basvuru_iptal_edildi',
        basvuruId: basvuruId,
        iptalSebebi: iptalSebebi,
        timestamp: new Date().toISOString()
      }
    });

    return guncellenmis;
  });
}

// Update-related functions removed from kariyer.service.ts

// --- Kariyer Merkezi için başvuru servisleri ---
export async function getAllBasvurularForKariyer() {
  return prisma.stajBasvurusu.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          faculty: true,
          class: true,
          department: true,
          tcKimlik: true,
          createdAt: true,
        }
      }
    },
  });
}

export async function getBasvuruByIdForKariyer(basvuruId: number) {
  return prisma.stajBasvurusu.findUnique({
    where: { id: basvuruId },
    select: {
      id: true,
      kurumAdi: true,
      kurumAdresi: true,
      sorumluTelefon: true,
      sorumluMail: true,
      yetkiliAdi: true,
      yetkiliUnvani: true,
      yurtDisi: true,
      turkFirmasi: true,
      stajTipi: true,
      baslangicTarihi: true,
      bitisTarihi: true,
      toplamGun: true,
      onayDurumu: true,
      createdAt: true,
      danismanAciklama: true,
      danismanOnayDurumu: true,
      kariyerMerkeziAciklama: true,
      kariyerMerkeziOnayDurumu: true,
      sirketAciklama: true,
      sirketOnayDurumu: true,
      // Document fields for download functionality
      transkriptDosyasi: true,
      sigortaDosyasi: true,
      hizmetDokumu: true,
      // Include CAP fields
      isCapBasvuru: true,
      capFakulte: true,
      capBolum: true,
      capDepartman: true,
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          faculty: true,
          class: true,
          tcKimlik: true,
        }
      }
    },
  });
}

export async function kariyerOnaylaBasvuru(basvuruId: number, aciklama?: string) {
  // Önce başvuruyu kontrol et
  const basvuru = await prisma.stajBasvurusu.findFirst({
    where: { 
      id: basvuruId,
      onayDurumu: OnayDurumu.KARIYER_MERKEZI_ONAYI_BEKLIYOR
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true
        }
      }
    }
  });

  if (!basvuru) {
    throw new Error('Başvuru bulunamadı veya onaylanamaz durumda');
  }

  // Başvuruyu şirket onayı beklenir duruma güncelle
  const updatedBasvuru = await prisma.stajBasvurusu.update({
    where: { id: basvuruId },
    data: {
      onayDurumu: OnayDurumu.SIRKET_ONAYI_BEKLIYOR,
      kariyerMerkeziOnayDurumu: 1, // 1: approved
      kariyerMerkeziAciklama: aciklama || null,
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true
        }
      }
    }
  });

  // Kariyer merkezi onayladıktan sonra öğrenciye bilgilendirme maili gönder
  try {
    const { sendKariyerMerkeziOnayBildirimMail } = await import('../utils/mailer.js');
    
    // Öğrenciye bilgilendirme
    await sendKariyerMerkeziOnayBildirimMail(
      basvuru.ogrenci.email ?? '',
      basvuru.ogrenci.name ?? '',
      basvuru.kurumAdi,
      basvuruId
    );
    
    console.log(`✅ Kariyer merkezi onayı sonrası bilgilendirme maili gönderildi - Başvuru ID: ${basvuruId}`);
  } catch (error) {
    console.error(`❌ Kariyer merkezi onayı sonrası mail gönderme hatası - Başvuru ID: ${basvuruId}:`, error);
    // Mail gönderilemese bile onay işlemi tamamlanır
  }

  // Kariyer merkezi onayladıktan sonra şirkete OTP gönder
  try {
    await generateAndSendOtp(basvuruId);
    console.log(`Kariyer Merkezi onayladı, şirkete OTP gönderildi - Başvuru ID: ${basvuruId}`);
  } catch (error) {
    console.error('OTP gönderme hatası:', error);
    // OTP gönderilemese bile başvuru durumu güncellenir
  }

  return updatedBasvuru;
}

export async function kariyerReddetBasvuru(basvuruId: number, redSebebi: string) {
  // Önce başvuruyu öğrenci bilgileriyle birlikte getir
  const basvuru = await prisma.stajBasvurusu.findFirst({
    where: { 
      id: basvuruId,
      onayDurumu: OnayDurumu.KARIYER_MERKEZI_ONAYI_BEKLIYOR
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true
        }
      }
    }
  });

  if (!basvuru) {
    throw new Error('Başvuru bulunamadı veya reddedilemez durumda');
  }

  const updatedBasvuru = await prisma.stajBasvurusu.update({
    where: { id: basvuruId },
    data: {
      onayDurumu: OnayDurumu.REDDEDILDI,
      kariyerMerkeziOnayDurumu: -1, // -1: rejected
      kariyerMerkeziAciklama: redSebebi,
      iptalSebebi: redSebebi, // Keep legacy field for backward compatibility
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true
        }
      }
    }
  });

  // Red sonrası öğrenciye kariyer merkezi red bildirimi gönder
  try {
    const { sendKariyerMerkeziRedBildirimi } = await import('../utils/mailer.js');
    await sendKariyerMerkeziRedBildirimi(
      basvuru.ogrenci.email ?? '',
      basvuru.ogrenci.name ?? '',
      basvuru.kurumAdi,
      basvuruId,
      redSebebi
    );
    console.log(`✅ Kariyer merkezi red bildirimi maili gönderildi - Başvuru ID: ${basvuruId}`);
  } catch (error) {
    console.error(`❌ Kariyer merkezi red bildirimi mail gönderme hatası - Başvuru ID: ${basvuruId}:`, error);
    // Mail gönderilemese bile red işlemi tamamlanır
  }

  return updatedBasvuru;
}

// kariyerUpdateBasvuru removed: career center update functionality deleted.

export async function searchBasvurular(searchTerm?: string, status?: string) {
  const where: QueryBuilder = {};
  
  if (searchTerm) {
    where.OR = [
      {
        kurumAdi: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        ogrenci: {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      },
      {
        ogrenci: {
          tcKimlik: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      },
      {
        sorumluTelefon: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
    ];
  }
  
  if (status) {
    where.onayDurumu = status;
  }
  
  return prisma.stajBasvurusu.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          faculty: true,
          class: true,
        },
      },
    },
  });
}

export async function searchKariyerBasvurular(
  searchTerm?: string, 
  status?: string, 
  page: number = 1, 
  pageSize: number = 100
) {
  const where: QueryBuilder = {};
  
  if (searchTerm && searchTerm.trim()) {
    where.OR = [
      {
        kurumAdi: {
          contains: searchTerm.trim(),
        },
      },
      {
        ogrenci: {
          name: {
            contains: searchTerm.trim(),
          },
        },
      },
      {
        ogrenci: {
          email: {
            contains: searchTerm.trim(),
          },
        },
      },
      {
        ogrenci: {
          studentId: {
            contains: searchTerm.trim(),
          },
        },
      },
      {
        ogrenci: {
          tcKimlik: {
            contains: searchTerm.trim(),
          },
        },
      },
      {
        sorumluTelefon: {
          contains: searchTerm.trim(),
        },
      },
    ];
  }
  
  if (status) {
    where.onayDurumu = status;
  }
  
  const skip = (page - 1) * pageSize;
  
  const [data, totalCount] = await Promise.all([
    prisma.stajBasvurusu.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        ogrenci: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            faculty: true,
            class: true,
          },
        },
        defter: {
          select: {
            id: true,
            defterDurumu: true,
            dosyaYolu: true,
            originalFileName: true,
            uploadDate: true,
          },
        },
      },
    }),
    prisma.stajBasvurusu.count({ where }),
  ]);
  
  return {
    data,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// Kariyer merkezi için: Belirli bir öğrencinin tüm başvurularını getir
export async function getOgrenciTumBasvurulariForKariyer(ogrenciId: number) {
  const basvurular = await prisma.stajBasvurusu.findMany({
    where: { ogrenciId },
    include: {
      ogrenci: {
        select: {
          id: true,
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
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return basvurular.map(basvuru => ({
    ...basvuru,
    ogrenci: {
      ...basvuru.ogrenci,
      isCapOgrenci: !!basvuru.ogrenci.capOgrenci,
      capFakulte: basvuru.ogrenci.capOgrenci?.capFakulte,
      capBolum: basvuru.ogrenci.capOgrenci?.capBolum,
      capDepartman: basvuru.ogrenci.capOgrenci?.capDepartman,
    }
  }));
}
