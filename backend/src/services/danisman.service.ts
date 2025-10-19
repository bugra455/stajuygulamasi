import { OnayDurumu, DefterDurumu } from '../generated/prisma/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/error.utils.js';
import { ValidationUtils } from '../utils/validation.utils.js';
import { generateAndSendOtp } from '../controllers/sirket.controller.js';
import { QueryBuilder } from '../types/common.types.js';
import LoggerService, { LogAction, LogLevel } from './logger.service.js';
import { prisma } from '../lib/prisma.js';

// Helper function to convert status string to OnayDurumu enum
function convertToOnayDurumu(status?: string): OnayDurumu | undefined {
  if (!status) return undefined;
  
  const statusMap: { [key: string]: OnayDurumu } = {
    'HOCA_ONAYI_BEKLIYOR': OnayDurumu.HOCA_ONAYI_BEKLIYOR,
    'KARIYER_MERKEZI_ONAYI_BEKLIYOR': OnayDurumu.KARIYER_MERKEZI_ONAYI_BEKLIYOR,
    'SIRKET_ONAYI_BEKLIYOR': OnayDurumu.SIRKET_ONAYI_BEKLIYOR,
    'ONAYLANDI': OnayDurumu.ONAYLANDI,
    'REDDEDILDI': OnayDurumu.REDDEDILDI,
    'IPTAL_EDILDI': OnayDurumu.IPTAL_EDILDI
  };
  
  return statusMap[status.trim()] || undefined;
}

// Helper function to convert status string to DefterDurumu enum
function convertToDefterDurumu(status?: string): DefterDurumu | undefined {
  if (!status) return undefined;
  
  const statusMap: { [key: string]: DefterDurumu } = {
    'BEKLEMEDE': DefterDurumu.BEKLEMEDE,
    'SIRKET_ONAYI_BEKLIYOR': DefterDurumu.SIRKET_ONAYI_BEKLIYOR,
    'SIRKET_REDDETTI': DefterDurumu.SIRKET_REDDETTI,
    'DANISMAN_ONAYI_BEKLIYOR': DefterDurumu.DANISMAN_ONAYI_BEKLIYOR,
    'DANISMAN_REDDETTI': DefterDurumu.DANISMAN_REDDETTI,
    'ONAYLANDI': DefterDurumu.ONAYLANDI,
    'REDDEDILDI': DefterDurumu.REDDEDILDI
  };
  
  return statusMap[status.trim()] || undefined;
}

// Danışmanın öğrencilerini getir (danışman ID'ye göre)
export async function getDanismanOgrencileri(danismanId: number) {
  ValidationUtils.validateId(danismanId, 'Danışman ID');

  // Get both normal students and CAP students
  const ogrenciler = await prisma.user.findMany({
    where: {
      OR: [
        // Normal advisor relationship
        {
          danismanId: danismanId,
          userType: 'OGRENCI'
        },
        // CAP advisor relationship
        {
          userType: 'OGRENCI',
          capOgrenci: {
            capDanismanId: danismanId
          }
        }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      tcKimlik: true,
      studentId: true,
      faculty: true,
      class: true,
      capOgrenci: {
        select: {
          capFakulte: true,
          capBolum: true,
          capDepartman: true,
          capSinif: true,
        }
      },
      basvurular: {
        select: {
          id: true,
          createdAt: true,
          onayDurumu: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Öğrenci listesini döndür ve başvuru bilgilerini ekle
  return ogrenciler.map(ogrenci => ({
    ...ogrenci,
    isCapOgrenci: !!ogrenci.capOgrenci,
    capFakulte: ogrenci.capOgrenci?.capFakulte,
    capBolum: ogrenci.capOgrenci?.capBolum,
    capDepartman: ogrenci.capOgrenci?.capDepartman,
    toplamBasvuru: ogrenci.basvurular.length,
    sonBasvuruTarihi: ogrenci.basvurular[0]?.createdAt || null,
    // CAP öğrencisi bilgisini temizle
    capOgrenci: undefined,
    basvurular: undefined
  }));
}

// Danışmanın onay bekleyen başvurularını getir (danışman ID'ye göre)
export async function getDanismanBasvurulari(danismanId: number) {
  ValidationUtils.validateId(danismanId, 'Danışman ID');

  // Get applications from both normal students and CAP students
  const basvurular = await prisma.stajBasvurusu.findMany({
    where: {
      OR: [
        // Normal advisor relationship
        {
          ogrenci: {
            danismanId: danismanId
          }
        },
        // CAP advisor relationship
        {
          isCapBasvuru: true,
          ogrenci: {
            capOgrenci: {
              capDanismanId: danismanId
            }
          }
        }
      ]
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          tcKimlik: true,
          studentId: true,
          faculty: true,
          class: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return basvurular;
}

// Belirli bir başvuruyu detaylarıyla getir (danışman ID'ye göre)
export async function getBasvuruDetayi(basvuruId: number, danismanId: number) {
  ValidationUtils.validateId(basvuruId, 'Başvuru ID');
  ValidationUtils.validateId(danismanId, 'Danışman ID');

  // First, try to find the basvuru with normal advisor relationship
  let basvuru = await prisma.stajBasvurusu.findFirst({
    where: {
      id: basvuruId,
      ogrenci: {
        danismanId: danismanId
      }
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          tcKimlik: true,
          studentId: true,
          faculty: true,
          class: true
        }
      },
  defter: true,
  // include capUser record if exists for this ogrenci
  // Note: capUser is a separate table; include via a relation on ogrenciId
  // We'll fetch it using a separate query below if needed
    }
  });

  // If not found with normal advisor relationship, check for CAP advisor relationship
  if (!basvuru) {
    basvuru = await prisma.stajBasvurusu.findFirst({
      where: {
        id: basvuruId,
        isCapBasvuru: true,
        ogrenci: {
          capOgrenci: {
            capDanismanId: danismanId
          }
        }
      },
      include: {
        ogrenci: {
          select: {
            id: true,
            name: true,
            email: true,
            tcKimlik: true,
            studentId: true,
            faculty: true,
            class: true
          }
        },
        defter: true,
      }
    });
  }

  if (!basvuru) {
    throw new NotFoundError('Başvuru bulunamadı veya erişim yetkiniz yok.');
  }

  // If this is a CAP başvurusu, try to fetch capUser record for the ogrenci and prefer its fields
  if (basvuru.isCapBasvuru) {
    try {
      // First attempt: find capUser where student's studentId matches AND capDanisman ID matches
      // This handles cases where ogrenciId may differ but student numbers align
      let capRecord = null as any;
      try {
        capRecord = await prisma.capUser.findFirst({
          where: {
            ogrenci: {
              studentId: basvuru.ogrenci.studentId
            },
            capDanismanId: danismanId
          },
          select: {
            id: true,
            capFakulte: true,
            capBolum: true,
            capDepartman: true,
            capSinif: true,
            capDanisman: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      } catch (e) {
        // ignore and try next fallback
        capRecord = null;
      }

      // Fallback 1: find capUser where ogrenciId matches AND capDanisman ID matches
      if (!capRecord) {
        capRecord = await prisma.capUser.findFirst({
          where: {
            ogrenciId: basvuru.ogrenciId,
            capDanismanId: danismanId
          },
          select: {
            id: true,
            capFakulte: true,
            capBolum: true,
            capDepartman: true,
            capSinif: true,
            capDanisman: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      }

      // Fallback 2: find capUser by ogrenciId only
      if (!capRecord) {
        capRecord = await prisma.capUser.findFirst({
          where: { ogrenciId: basvuru.ogrenciId },
          select: {
            id: true,
            capFakulte: true,
            capBolum: true,
            capDepartman: true,
            capSinif: true,
            capDanisman: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      }

      if (capRecord) {
        // Build ogrenciDetaylari: faculty/department come from StajBasvurusu (basvuru.capFakulte/capBolum/capDepartman)
        // class (sinif) comes from capUser (use capBolum or compose with departman)
        const classValue = capRecord.capBolum && capRecord.capDepartman
          ? `${capRecord.capBolum} - ${capRecord.capDepartman}`
          : capRecord.capBolum ?? basvuru.ogrenci.class;

        const ogrenciDetaylari = {
          id: basvuru.ogrenci.id,
          name: basvuru.ogrenci.name,
          email: basvuru.ogrenci.email,
          tcKimlik: basvuru.ogrenci.tcKimlik,
          studentId: basvuru.ogrenci.studentId,
          // use faculty/bolum information from the StajBasvurusu record itself
          faculty: basvuru.capFakulte ?? capRecord.capFakulte ?? basvuru.ogrenci.faculty,
          class: classValue,
          capDepartman: basvuru.capDepartman ?? capRecord.capDepartman ?? null,
          capDanisman: capRecord.capDanisman ?? null
        } as const;

        return {
          ...basvuru,
          ogrenciDetaylari
        } as any;
      }
    } catch (err) {
      // ignore cap lookup errors - return base basvuru
      console.error('CAP lookup error in getBasvuruDetayi:', err);
    }
  }

  // fallback: return basvuru with ogrenciDetaylari derived from normal user fields
  return {
    ...basvuru,
    ogrenciDetaylari: {
      id: basvuru.ogrenci.id,
      name: basvuru.ogrenci.name,
      email: basvuru.ogrenci.email,
      tcKimlik: basvuru.ogrenci.tcKimlik,
      studentId: basvuru.ogrenci.studentId,
      faculty: basvuru.ogrenci.faculty,
      class: basvuru.ogrenci.class,
      capDepartman: null,
      capDanisman: null
    }
  } as any;
}

// Başvuruyu onaylama
export async function onaylaBasvuru(basvuruId: number, danismanId: number, danismanEmail: string, aciklama?: string) {
  ValidationUtils.validateId(basvuruId, 'Başvuru ID');
  ValidationUtils.validateId(danismanId, 'Danışman ID');

  const basvuru = await prisma.stajBasvurusu.findFirst({
    where: {
      id: basvuruId,
      danismanMail: danismanEmail,
      onayDurumu: OnayDurumu.HOCA_ONAYI_BEKLIYOR
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
    throw new NotFoundError('Başvuru bulunamadı veya onaylanamaz durumda.');
  }

  // Transaction ile başvuruyu onayla ve log ekle
  const updatedBasvuru = await prisma.$transaction(async (prisma) => {
    // Başvuruyu güncelle
    const updated = await prisma.stajBasvurusu.update({
      where: { id: basvuruId },
      data: {
        onayDurumu: OnayDurumu.KARIYER_MERKEZI_ONAYI_BEKLIYOR,
        danismanOnayDurumu: 1, // 1: approved
        danismanAciklama: aciklama || null,
        updatedAt: new Date()
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

    // Log kaydı MongoDB'ye ekle
    const logger = LoggerService.getInstance();
    await logger.log(null, {
      action: LogAction.HOCA_ONAYLADI,
      level: LogLevel.INFO,
      userId: danismanId,
      details: {
        action: 'danisman_onayladi',
        basvuruId: basvuruId,
        aciklama: aciklama || 'Danışman tarafından onaylandı',
        timestamp: new Date().toISOString()
      }
    });

    // Staj defteri oluştur
    await prisma.stajDefteri.create({
      data: {
        stajBasvurusuId: basvuruId,
        defterDurumu: DefterDurumu.BEKLEMEDE
      }
    });

    return updated;
  });

  // Danışman onayladıktan sonra öğrenciye bilgilendirme maili gönder
  try {
    const { sendDanismanOnayBildirimMail, sendDanismanOnayBildirimKariyerMail } = await import('../utils/mailer.js');
    await sendDanismanOnayBildirimMail(
      basvuru.ogrenci.email ?? '',
      basvuru.ogrenci.name ?? '',
      basvuru.kurumAdi,
      basvuruId
    );
    await sendDanismanOnayBildirimKariyerMail(
      basvuru.ogrenci.name ?? '',
      basvuru.kurumAdi,
      basvuruId
    );
    console.log(`✅ Danışman onayı sonrası bilgilendirme maili gönderildi - Başvuru ID: ${basvuruId}`);
  } catch (error) {
    console.error(`❌ Danışman onayı sonrası mail gönderme hatası - Başvuru ID: ${basvuruId}:`, error);
    // Mail gönderilemese bile onay işlemi tamamlanır
  }

  console.log(`Danışman onayladı - Başvuru ID: ${basvuruId}, Kariyer Merkezi onayı bekleniyor`);
  
  return updatedBasvuru;
}

// Başvuruyu reddetme
export async function reddetBasvuru(basvuruId: number, danismanId: number, danismanEmail: string, redSebebi: string) {
  ValidationUtils.validateId(basvuruId, 'Başvuru ID');
  ValidationUtils.validateId(danismanId, 'Danışman ID');
  ValidationUtils.validateRequired(redSebebi, 'Red sebebi');

  const basvuru = await prisma.stajBasvurusu.findFirst({
    where: {
      id: basvuruId,
      danismanMail: danismanEmail,
      onayDurumu: OnayDurumu.HOCA_ONAYI_BEKLIYOR
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
    throw new NotFoundError('Başvuru bulunamadı veya reddedilemez durumda.');
  }

  // Transaction ile başvuruyu reddet ve log ekle
  const updatedBasvuru = await prisma.$transaction(async (prisma) => {
    // Başvuruyu güncelle
    const updated = await prisma.stajBasvurusu.update({
      where: { id: basvuruId },
      data: {
        onayDurumu: OnayDurumu.REDDEDILDI,
        danismanOnayDurumu: -1, // -1: rejected
        danismanAciklama: redSebebi,
        iptalSebebi: redSebebi, // Keep legacy field for backward compatibility
        updatedAt: new Date()
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

    // Log kaydı MongoDB'ye ekle
    const logger = LoggerService.getInstance();
    await logger.log(null, {
      action: LogAction.HOCA_REDDETTI,
      level: LogLevel.INFO,
      userId: danismanId,
      details: {
        action: 'danisman_reddetti',
        basvuruId: basvuruId,
        redSebebi: redSebebi,
        timestamp: new Date().toISOString()
      }
    });

    return updated;
  });

  // Red sonrası öğrenciye danışman red bildirimi gönder
  try {
    const { sendDanismanRedBildirimi } = await import('../utils/mailer.js');
    await sendDanismanRedBildirimi(
      updatedBasvuru.ogrenci.email ?? '',
      updatedBasvuru.ogrenci.name ?? '',
      basvuru.kurumAdi,
      basvuruId,
      redSebebi
    );
    console.log(`✅ Danışman red bildirimi maili gönderildi - Başvuru ID: ${basvuruId}`);
  } catch (error) {
    console.error(`❌ Danışman red bildirimi mail gönderme hatası - Başvuru ID: ${basvuruId}:`, error);
    // Mail gönderilemese bile red işlemi tamamlanır
  }

  return updatedBasvuru;
}

// Danışmanın öğrencilerinin defterlerini getir
export async function getDanismanDefterler(danismanEmail: string) {
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  const currentDate = new Date();
  console.log('🔍 [DANISMAN_DEFTERLER] Current date for filtering:', currentDate.toISOString());

  const defterler = await prisma.stajDefteri.findMany({
    where: {
      stajBasvurusu: {
        danismanMail: danismanEmail,
        onayDurumu: {
          in: [OnayDurumu.KARIYER_MERKEZI_ONAYI_BEKLIYOR, OnayDurumu.SIRKET_ONAYI_BEKLIYOR, OnayDurumu.ONAYLANDI]
        }
        // Removed the baslangicTarihi filter from database query to handle it in application logic
      }
    },
    include: {
      stajBasvurusu: {
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
          }
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  console.log('🔍 [DANISMAN_DEFTERLER] Found defters from DB:', defterler.length);
  defterler.forEach(defter => {
    console.log('📋 [DB_DEFTER]:', {
      id: defter.id,
      kurumAdi: defter.stajBasvurusu.kurumAdi,
      baslangicTarihi: defter.stajBasvurusu.baslangicTarihi,
      bitisTarihi: defter.stajBasvurusu.bitisTarihi,
      defterDurumu: defter.defterDurumu
    });
  });

    // Defterler için staj durumunu hesapla ve geçerliliğini kontrol et
  const updatedDefterler = defterler.map(defter => {
    const now = new Date(); 
    const internshipEndDate = new Date(defter.stajBasvurusu.bitisTarihi);
    const internshipStartDate = new Date(defter.stajBasvurusu.baslangicTarihi);
    const fiveDaysAfterEnd = new Date(internshipEndDate);
    fiveDaysAfterEnd.setDate(fiveDaysAfterEnd.getDate() + 5);

    return {
      ...defter,
      stajDevamEdiyor: now >= internshipStartDate && now <= internshipEndDate,
      defterYuklenebilir: now > internshipEndDate && now <= fiveDaysAfterEnd,
      stajBitisTarihi: internshipEndDate,
      defterYuklemeSonTarihi: fiveDaysAfterEnd,
      stajBaslangicTarihi: internshipStartDate
    };
  });

  // Filter out diaries that meet ANY of these criteria:
  // 1. Internship hasn't started yet (statusWaitingForStart)
  // 2. Past their upload deadline and no file uploaded (BUT ONLY if not yet approved by company/advisor)
  const filteredDefterler = updatedDefterler.filter(defter => {
    const now = new Date();
    const fiveDaysAfterEnd = new Date(defter.stajBitisTarihi);
    fiveDaysAfterEnd.setDate(fiveDaysAfterEnd.getDate() + 5);
    
    console.log('🔍 [FILTERING] Checking defter:', {
      id: defter.id,
      kurumAdi: defter.stajBasvurusu.kurumAdi,
      baslangicTarihi: defter.stajBaslangicTarihi.toISOString(),
      currentDate: now.toISOString(),
      hasStarted: now >= defter.stajBaslangicTarihi,
      defterDurumu: defter.defterDurumu,
      dosyaYolu: !!defter.dosyaYolu
    });
    
    // Exclude if internship hasn't started yet (regardless of status)
    if (now < defter.stajBaslangicTarihi) {
      console.log('❌ [FILTERING] EXCLUDED - Internship hasn\'t started yet:', defter.stajBasvurusu.kurumAdi);
      return false;
    }
    
    // IMPORTANT: Only exclude if past upload deadline AND no file uploaded AND not yet in approval process
    // If defter is already uploaded or in approval stages, show it regardless of deadline
    const isInApprovalProcess = [
      'SIRKET_ONAYI_BEKLIYOR', 
      'DANISMAN_ONAYI_BEKLIYOR', 
      'ONAYLANDI',
      'SIRKET_REDDETTI',
      'DANISMAN_REDDETTI',
      'REDDEDILDI'
    ].includes(defter.defterDurumu);
    
    if (now > fiveDaysAfterEnd && !defter.dosyaYolu && !isInApprovalProcess) {
      console.log('❌ [FILTERING] EXCLUDED - Past upload deadline, no file, not in approval:', defter.stajBasvurusu.kurumAdi);
      return false;
    }
    
    console.log('✅ [FILTERING] INCLUDED:', defter.stajBasvurusu.kurumAdi, 'Status:', defter.defterDurumu);
    return true;
  });

  console.log('🎯 [DANISMAN_DEFTERLER] Final filtered count:', filteredDefterler.length);
  console.log('🎯 [DANISMAN_DEFTERLER] Returning defters:', filteredDefterler.map(d => ({
    id: d.id,
    kurumAdi: d.stajBasvurusu.kurumAdi,
    baslangicTarihi: d.stajBaslangicTarihi
  })));

  return filteredDefterler;
}

// Defter detayını getir
export async function getDefterDetayi(defterId: number, danismanEmail: string) {
  ValidationUtils.validateId(defterId, 'Defter ID');
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  const defter = await prisma.stajDefteri.findFirst({
    where: {
      id: defterId,
      stajBasvurusu: {
        danismanMail: danismanEmail
      }
    },
    include: {
      stajBasvurusu: {
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
          }
        }
      }
    }
  });

  if (!defter) {
    throw new NotFoundError('Defter bulunamadı veya erişim yetkiniz yok.');
  }

  return defter;
}

// Defteri onaylama/durumunu güncelleme
export async function updateDefterDurumu(defterId: number, danismanEmail: string, yeniDurum: string, aciklama?: string) {
  ValidationUtils.validateId(defterId, 'Defter ID');
  ValidationUtils.validateRequired(yeniDurum, 'Yeni durum');

  const validStatuses = [
    DefterDurumu.BEKLEMEDE, 
    DefterDurumu.SIRKET_ONAYI_BEKLIYOR,
    DefterDurumu.SIRKET_REDDETTI,
    DefterDurumu.DANISMAN_ONAYI_BEKLIYOR,
    DefterDurumu.DANISMAN_REDDETTI,
    DefterDurumu.ONAYLANDI, 
    DefterDurumu.REDDEDILDI
  ];
  if (!validStatuses.includes(yeniDurum as any)) {
    throw new BadRequestError('Geçersiz durum. İzin verilen durumlar: ' + validStatuses.join(', '));
  }

  const defter = await prisma.stajDefteri.findFirst({
    where: {
      id: defterId,
      stajBasvurusu: {
        danismanMail: danismanEmail
      }
    }
  });

  if (!defter) {
    throw new NotFoundError('Defter bulunamadı veya erişim yetkiniz yok.');
  }

  const updatedDefter = await prisma.stajDefteri.update({
    where: { id: defterId },
    data: {
      defterDurumu: yeniDurum as DefterDurumu,
      updatedAt: new Date()
    },
    include: {
      stajBasvurusu: {
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
      }
    }
  });

  return updatedDefter;
}

// Pagination destekli danışman arama fonksiyonları
export async function searchDanismanBasvurular(
  danismanEmail: string,
  searchTerm?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 100
) {
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  const where: QueryBuilder = {
    danismanMail: danismanEmail
  };

  if (searchTerm && searchTerm.trim()) {
    where.OR = [
      { kurumAdi: { contains: searchTerm.trim() } },
      { 
        ogrenci: {
          OR: [
            { name: { contains: searchTerm.trim() } },
            { email: { contains: searchTerm.trim() } },
            { studentId: { contains: searchTerm.trim() } }
          ]
        }
      }
    ];
  }

  if (status && status.trim()) {
    const enumStatus = convertToOnayDurumu(status.trim());
    if (enumStatus) {
      where.onayDurumu = enumStatus;
    }
  }

  const [data, totalCount] = await Promise.all([
    prisma.stajBasvurusu.findMany({
      where,
      include: {
        ogrenci: {
          select: {
            id: true,
            name: true,
            email: true,
            tcKimlik: true,
            studentId: true,
            faculty: true,
            class: true
          }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.stajBasvurusu.count({ where })
  ]);

  return { data, totalCount };
}

export async function searchDanismanDefterler(
  danismanEmail: string,
  searchTerm?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 100
) {
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  const currentDate = new Date();
  console.log('🔍 [SEARCH_DANISMAN_DEFTERLER] Current date for filtering:', currentDate.toISOString());
  
  const where: QueryBuilder = {
    stajBasvurusu: {
      danismanMail: danismanEmail
      // Removed the baslangicTarihi filter from database query to handle it in application logic
    }
  };

  if (searchTerm && searchTerm.trim()) {
    (where.stajBasvurusu as Record<string, unknown>).OR = [
      { kurumAdi: { contains: searchTerm.trim() } },
      { 
        ogrenci: {
          OR: [
            { name: { contains: searchTerm.trim() } },
            { email: { contains: searchTerm.trim() } },
            { studentId: { contains: searchTerm.trim() } }
          ]
        }
      }
    ];
  }

  if (status && status.trim()) {
    const enumStatus = convertToDefterDurumu(status.trim());
    if (enumStatus) {
      where.defterDurumu = enumStatus;
    }
  }

  const [data, totalCount] = await Promise.all([
    prisma.stajDefteri.findMany({
      where,
      include: {
        stajBasvurusu: {
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
            }
          }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.stajDefteri.count({ where })
  ]);

  // Defterler için staj durumunu hesapla ve geçerliliğini kontrol et
  const now = new Date();
  const updatedData = data.map(defter => {
    const internshipEndDate = new Date(defter.stajBasvurusu.bitisTarihi);
    const internshipStartDate = new Date(defter.stajBasvurusu.baslangicTarihi);
    const fiveDaysAfterEnd = new Date(internshipEndDate);
    fiveDaysAfterEnd.setDate(fiveDaysAfterEnd.getDate() + 5);

    return {
      ...defter,
      stajDevamEdiyor: now >= internshipStartDate && now <= internshipEndDate,
      defterYuklenebilir: now > internshipEndDate && now <= fiveDaysAfterEnd,
      stajBitisTarihi: internshipEndDate,
      defterYuklemeSonTarihi: fiveDaysAfterEnd,
      stajBaslangicTarihi: internshipStartDate
    };
  });

  // Filter out diaries that meet ANY of these criteria:
  // 1. Internship hasn't started yet (statusWaitingForStart)
  // 2. Past their upload deadline and no file uploaded (BUT ONLY if not yet approved by company/advisor)
  const filteredData = updatedData.filter(defter => {
    const now = new Date();
    const fiveDaysAfterEnd = new Date(defter.stajBitisTarihi);
    fiveDaysAfterEnd.setDate(fiveDaysAfterEnd.getDate() + 5);
    
    console.log('🔍 [SEARCH_FILTERING] Checking defter:', {
      id: defter.id,
      kurumAdi: defter.stajBasvurusu.kurumAdi,
      baslangicTarihi: defter.stajBaslangicTarihi.toISOString(),
      currentDate: now.toISOString(),
      hasStarted: now >= defter.stajBaslangicTarihi,
      defterDurumu: defter.defterDurumu,
      dosyaYolu: !!defter.dosyaYolu
    });
    
    // Exclude if internship hasn't started yet (regardless of status)
    if (now < defter.stajBaslangicTarihi) {
      console.log('❌ [SEARCH_FILTERING] EXCLUDED - Internship hasn\'t started yet:', defter.stajBasvurusu.kurumAdi);
      return false;
    }
    
    // IMPORTANT: Only exclude if past upload deadline AND no file uploaded AND not yet in approval process
    // If defter is already uploaded or in approval stages, show it regardless of deadline
    const isInApprovalProcess = [
      'SIRKET_ONAYI_BEKLIYOR', 
      'DANISMAN_ONAYI_BEKLIYOR', 
      'ONAYLANDI',
      'SIRKET_REDDETTI',
      'DANISMAN_REDDETTI',
      'REDDEDILDI'
    ].includes(defter.defterDurumu);
    
    if (now > fiveDaysAfterEnd && !defter.dosyaYolu && !isInApprovalProcess) {
      console.log('❌ [SEARCH_FILTERING] EXCLUDED - Past upload deadline, no file, not in approval:', defter.stajBasvurusu.kurumAdi);
      return false;
    }
    
    console.log('✅ [SEARCH_FILTERING] INCLUDED:', defter.stajBasvurusu.kurumAdi, 'Status:', defter.defterDurumu);
    return true;
  });

  return { data: filteredData, totalCount: filteredData.length };
}

export async function searchDanismanOgrenciler(
  danismanId: number,
  searchTerm?: string,
  page: number = 1,
  pageSize: number = 100
) {
  ValidationUtils.validateId(danismanId, 'Danışman ID');

  // Base where clause for students assigned to this advisor
  const where: QueryBuilder = {
    danismanId: danismanId,
    userType: 'OGRENCI'
  };

  if (searchTerm && searchTerm.trim()) {
    where.OR = [
      { name: { contains: searchTerm.trim() } },
      { email: { contains: searchTerm.trim() } },
      { tcKimlik: { contains: searchTerm.trim() } },
      { studentId: { contains: searchTerm.trim() } }
    ];
  }

  const [data, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        tcKimlik: true,
        faculty: true,
        class: true
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        name: 'asc'
      }
    }),
    prisma.user.count({ where })
  ]);

  // Her öğrenci için istatistikleri hesapla - optimize with batch queries
  const studentIds = data.map(ogrenci => ogrenci.id);
  
  const [basvuruStats, sonBasvurular] = await Promise.all([
    prisma.stajBasvurusu.groupBy({
      by: ['ogrenciId'],
      where: { ogrenciId: { in: studentIds } },
      _count: { id: true }
    }),
    prisma.stajBasvurusu.findMany({
      where: { ogrenciId: { in: studentIds } },
      select: { ogrenciId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      distinct: ['ogrenciId']
    })
  ]);

  // Create lookup maps for O(1) access
  const basvuruCountMap = new Map(basvuruStats.map(stat => [stat.ogrenciId, stat._count.id]));
  const sonBasvuruMap = new Map(sonBasvurular.map(basvuru => [basvuru.ogrenciId, basvuru.createdAt]));

  const ogrencilerWithStats = data.map(ogrenci => {
    return {
      ...ogrenci,
      toplamBasvuru: basvuruCountMap.get(ogrenci.id) || 0,
      sonBasvuruTarihi: sonBasvuruMap.get(ogrenci.id) || null
    };
  });

  return { data: ogrencilerWithStats, totalCount };
}

// Belirli bir öğrencinin tüm başvurularını getir (danışman kısıtlaması ile)
export async function getOgrenciTumBasvurulari(ogrenciId: number, danismanId: number) {
  ValidationUtils.validateId(ogrenciId, 'Öğrenci ID');
  ValidationUtils.validateId(danismanId, 'Danışman ID');

  const basvurular = await prisma.stajBasvurusu.findMany({
    where: {
      ogrenciId: ogrenciId,
      ogrenci: {
        danismanId: danismanId
      }
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          tcKimlik: true,
          studentId: true,
          faculty: true,
          class: true,
          capOgrenci: {
            select: {
              capFakulte: true,
              capBolum: true,
              capDepartman: true,
            capSinif: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
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

// Belirli bir öğrencinin tüm başvurularını getir (modal için - kısıtlama olmadan)
export async function getOgrenciTumBasvurulariModal(ogrenciId: number) {
  ValidationUtils.validateId(ogrenciId, 'Öğrenci ID');

  const basvurular = await prisma.stajBasvurusu.findMany({
    where: {
      ogrenciId: ogrenciId
    },
    include: {
      ogrenci: {
        select: {
          id: true,
          name: true,
          email: true,
          tcKimlik: true,
          studentId: true,
          faculty: true,
          class: true,
          capOgrenci: {
            select: {
              capFakulte: true,
              capBolum: true,
              capDepartman: true,
            capSinif: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
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

// Danışman için belirli bir öğrencinin detaylarını getir (kişisel bilgiler + CAP bilgileri)
export async function getDanismanOgrenciDetay(ogrenciId: number, danismanEmail: string) {
  ValidationUtils.validateId(ogrenciId, 'Öğrenci ID');
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  // Öğrenci bilgilerini ve capOgrenci ilişkisindeki bilgileri al
  const ogrenci = await prisma.user.findUnique({
    where: { id: ogrenciId },
    select: {
      id: true,
      name: true,
      email: true,
      tcKimlik: true,
      studentId: true,
      faculty: true,
      department: true,
      class: true,
      capOgrenci: {
        select: {
          capFakulte: true,
          capBolum: true,
          capDepartman: true,
            capSinif: true,
          capDanisman: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  if (!ogrenci) throw new NotFoundError('Öğrenci bulunamadı');

  // Danışmanın bu öğrenciye erişim yetkisi var mı kontrol et
  // 1. Asıl danışman mı (staj başvurularında danışman olarak geçiyor mu)?
  const asılDanismanBasvuru = await prisma.stajBasvurusu.findFirst({
    where: { ogrenciId, danismanMail: danismanEmail }
  });

  // 2. CAP danışmanı mı?
  const capDanismanMi = ogrenci.capOgrenci?.capDanisman?.email === danismanEmail;

  // 3. Muafiyet başvurularında danışman mı?
  const muafiyetDanisman = await prisma.muafiyetBasvurusu.findFirst({
    where: { ogrenciId, danismanMail: danismanEmail }
  });

  // Hiçbir yetki yoksa erişim reddet
  if (!asılDanismanBasvuru && !capDanismanMi && !muafiyetDanisman) {
    throw new NotFoundError('Öğrenci bulunamadı veya bu öğrenciye erişim yetkiniz yok.');
  }

  return {
    id: ogrenci.id,
    name: ogrenci.name,
    email: ogrenci.email,
    tcKimlik: ogrenci.tcKimlik,
    studentId: ogrenci.studentId,
    faculty: ogrenci.faculty,
    department: ogrenci.department,
    class: ogrenci.class,
    isCapOgrenci: !!ogrenci.capOgrenci,
    capFakulte: ogrenci.capOgrenci?.capFakulte ?? null,
    capBolum: ogrenci.capOgrenci?.capBolum ?? null,
    capDepartman: ogrenci.capOgrenci?.capDepartman ?? null,
    capDanisman: ogrenci.capOgrenci?.capDanisman ?? null
  } as const;
}

// Danışman defter onayı (yeni defter onay sistemi için)
export async function danismanDefterOnay(
  defterId: number,
  danismanEmail: string,
  onayDurumu: 'ONAYLANDI' | 'REDDEDILDI',
  aciklama?: string
) {
  console.log('🔐 [DANISMAN_DEFTER_ONAY] Danışman defter onayı başlatıldı');
  console.log('🔐 [DANISMAN_DEFTER_ONAY] Defter ID:', defterId);
  console.log('🔐 [DANISMAN_DEFTER_ONAY] Danışman Email:', danismanEmail);
  console.log('🔐 [DANISMAN_DEFTER_ONAY] Onay Durumu:', onayDurumu);

  try {
    // Defterin danışman onayına hazır olup olmadığını kontrol et
    const defter = await prisma.stajDefteri.findFirst({
      where: {
        id: defterId,
        defterDurumu: DefterDurumu.DANISMAN_ONAYI_BEKLIYOR,
        stajBasvurusu: {
          danismanMail: danismanEmail
        }
      },
      include: {
        stajBasvurusu: {
          include: {
            ogrenci: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!defter) {
      throw new NotFoundError('Defter bulunamadı, danışman onayına hazır değil veya bu defteri onaylama yetkiniz yok');
    }

    console.log('📋 [DANISMAN_DEFTER_ONAY] Defter bulundu:', {
      id: defter.id,
      kurumAdi: defter.stajBasvurusu.kurumAdi,
      ogrenciAdi: defter.stajBasvurusu.ogrenci.name,
      mevcutDurum: defter.defterDurumu
    });

    // Defter durumunu güncelle
    const yeniDurum = onayDurumu === 'ONAYLANDI' 
      ? DefterDurumu.ONAYLANDI 
      : DefterDurumu.DANISMAN_REDDETTI;

    const updatedDefter = await prisma.stajDefteri.update({
      where: { id: defterId },
      data: {
        defterDurumu: yeniDurum,
        danismanOnayTarihi: onayDurumu === 'ONAYLANDI' ? new Date() : null,
        danismanOnayDurumu: onayDurumu === 'ONAYLANDI' ? 1 : -1,
        danismanAciklama: aciklama || null,
        // Keep legacy field for backward compatibility
        redSebebi: onayDurumu === 'REDDEDILDI' ? aciklama || null : null,
        updatedAt: new Date()
      },
      include: {
        stajBasvurusu: {
          include: {
            ogrenci: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ [DANISMAN_DEFTER_ONAY] Danışman defter ${onayDurumu} işlemi tamamlandı - Defter ID: ${defterId}`);

    // TODO: Öğrenciye bilgilendirme maili gönder
    try {
      if (onayDurumu === 'ONAYLANDI') {
        const { sendDefterOnayBildirimMail } = await import('../utils/mailer.js');
        await sendDefterOnayBildirimMail(
          defter.stajBasvurusu.ogrenci.email || '',
          defter.stajBasvurusu.ogrenci.name || '',
          defter.stajBasvurusu.kurumAdi || '',
          defterId
        );
        console.log(`✅ [DANISMAN_DEFTER_ONAY] Öğrenciye defter onay bildirimi gönderildi - Defter ID: ${defterId}`);
      } else {
        const { sendDefterRedBildirimMail } = await import('../utils/mailer.js');
        await sendDefterRedBildirimMail(
          defter.stajBasvurusu.ogrenci.email || '',
          defter.stajBasvurusu.ogrenci.name || '',
          defter.stajBasvurusu.kurumAdi || '',
          defterId,
          aciklama || 'Danışman tarafından reddedildi'
        );
        console.log(`✅ [DANISMAN_DEFTER_ONAY] Öğrenciye defter red bildirimi gönderildi - Defter ID: ${defterId}`);
      }
    } catch (error) {
      console.error(`❌ [DANISMAN_DEFTER_ONAY] Mail gönderme hatası - Defter ID: ${defterId}:`, error);
      // Mail gönderilemese bile onay/red işlemi tamamlanır
    }

    return {
      success: true,
      message: `Defter ${onayDurumu === 'ONAYLANDI' ? 'onaylandı' : 'reddedildi'}`,
      data: updatedDefter
    };

  } catch (error) {
    console.error('❌ [DANISMAN_DEFTER_ONAY] Danışman defter onay hatası:', error);
    throw error;
  }
}

// MUAFIYET BAŞVURU YÖNETİMİ

// Danışmanın muafiyet başvurularını getir
export async function getDanismanMuafiyetBasvurulari(danismanEmail: string) {
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  const muafiyetBasvurular = await prisma.muafiyetBasvurusu.findMany({
    where: {
      danismanMail: danismanEmail
    },
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
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return muafiyetBasvurular.map(basvuru => ({
    ...basvuru,
    createdAt: basvuru.createdAt.toISOString(),
    updatedAt: basvuru.updatedAt.toISOString(),
    type: 'MUAFIYET'
  }));
}

// Muafiyet başvuru detayını getir
export async function getMuafiyetDetayi(muafiyetId: number, danismanEmail: string) {
  ValidationUtils.validateId(muafiyetId, 'Muafiyet ID');
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  const muafiyet = await prisma.muafiyetBasvurusu.findFirst({
    where: {
      id: muafiyetId,
      danismanMail: danismanEmail
    },
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
      }
    }
  });

  if (!muafiyet) {
    throw new NotFoundError('Muafiyet başvurusu bulunamadı veya erişim yetkiniz yok.');
  }

  return muafiyet;
}

// Muafiyet başvurusunu onayla
export async function onaylaMuafiyetBasvuru(
  muafiyetId: number, 
  danismanEmail: string, 
  aciklama?: string
) {
  ValidationUtils.validateId(muafiyetId, 'Muafiyet ID');
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');

  const muafiyet = await getMuafiyetDetayi(muafiyetId, danismanEmail);

  if (muafiyet.danismanOnayDurumu !== 0) {
    throw new BadRequestError('Bu muafiyet başvurusu zaten değerlendirilmiş.');
  }

  const updatedMuafiyet = await prisma.muafiyetBasvurusu.update({
    where: { id: muafiyetId },
    data: {
      danismanOnayDurumu: 1, // Onaylandı
      danismanAciklama: aciklama || 'Danışman tarafından onaylandı',
      onayDurumu: 'ONAYLANDI'
    },
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
      }
    }
  });

  // TODO: Öğrenciye bilgilendirme maili gönder
  try {
    // Mail fonksiyonu henüz implement edilmedi
    console.log(`✅ [MUAFIYET_ONAY] Öğrenciye muafiyet onay bildirimi gönderilecek - Muafiyet ID: ${muafiyetId}`);
  } catch (error) {
    console.error(`❌ [MUAFIYET_ONAY] Mail gönderme hatası - Muafiyet ID: ${muafiyetId}:`, error);
  }

  return updatedMuafiyet;
}

// Muafiyet başvurusunu reddet
export async function reddetMuafiyetBasvuru(
  muafiyetId: number, 
  danismanEmail: string, 
  redSebebi: string
) {
  ValidationUtils.validateId(muafiyetId, 'Muafiyet ID');
  ValidationUtils.validateRequired(danismanEmail, 'Danışman email');
  ValidationUtils.validateRequired(redSebebi, 'Red sebebi');

  const muafiyet = await getMuafiyetDetayi(muafiyetId, danismanEmail);

  if (muafiyet.danismanOnayDurumu !== 0) {
    throw new BadRequestError('Bu muafiyet başvurusu zaten değerlendirilmiş.');
  }

  const updatedMuafiyet = await prisma.muafiyetBasvurusu.update({
    where: { id: muafiyetId },
    data: {
      danismanOnayDurumu: -1, // Reddedildi
      danismanAciklama: redSebebi,
      onayDurumu: 'REDDEDILDI'
    },
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
      }
    }
  });

  // TODO: Öğrenciye bilgilendirme maili gönder
  try {
    // Mail fonksiyonu henüz implement edilmedi
    console.log(`✅ [MUAFIYET_RED] Öğrenciye muafiyet red bildirimi gönderilecek - Muafiyet ID: ${muafiyetId}`);
  } catch (error) {
    console.error(`❌ [MUAFIYET_RED] Mail gönderme hatası - Muafiyet ID: ${muafiyetId}:`, error);
  }

  return updatedMuafiyet;
}
