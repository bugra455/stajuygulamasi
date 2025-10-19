import { prisma } from '../lib/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { DefterPdfUploadDTO, DefterResponseDTO } from '../dtos/defter.dto.js';
import { ValidationUtils } from '../utils/validation.utils.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/error.utils.js';
import { FileService } from '../utils/file.utils.js';
import { OnayDurumu, DefterDurumu } from '../generated/prisma/index.js';
import { sendDefterSirketOtpMail } from '../utils/mailer.js';
import { DebugUtils } from '../utils/debug.utils.js';
import LoggerService, { LogAction, LogLevel } from './logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kullanıcının tüm defterlerini getir (staj durumu göz önünde bulundurularak)
export async function getDefterlerByUserId(userId: number) {
  // Input validation
  if (!userId || userId <= 0) {
    throw { statusCode: 400, message: 'Geçersiz kullanıcı ID.' };
  }

  try {
    const defterler = await prisma.stajDefteri.findMany({
      where: {
        stajBasvurusu: {
          ogrenciId: userId,
          onayDurumu: OnayDurumu.ONAYLANDI // Sadece onaylanmış başvuruların defterleri
        }
      },
      include: {
        stajBasvurusu: {
          select: {
            id: true,
            kurumAdi: true,
            stajTipi: true,
            baslangicTarihi: true,
            bitisTarihi: true,
            onayDurumu: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Defterler için staj durumunu hesapla ve uygun durumu belirle
    const now = new Date();
    const updatedDefterler = defterler.map(defter => {
      const internshipStartDate = new Date(defter.stajBasvurusu.baslangicTarihi);
      const internshipEndDate = new Date(defter.stajBasvurusu.bitisTarihi);
      const fiveDaysAfterEnd = new Date(internshipEndDate);
      fiveDaysAfterEnd.setDate(fiveDaysAfterEnd.getDate() + 5);

      let calculatedStatus = defter.defterDurumu;
      
      // Eğer defter henüz yüklenmemişse ve staj süresi kontrolü yap
      if (defter.defterDurumu === DefterDurumu.BEKLEMEDE && !defter.dosyaYolu) {
        if (now < internshipStartDate) {
          // Staj henüz başlamamış
          calculatedStatus = DefterDurumu.BEKLEMEDE; // "Staj Başlangıcı Bekleniyor"
        } else if (now >= internshipStartDate && now <= internshipEndDate) {
          // Staj devam ediyor
          calculatedStatus = 'STAJ_DEVAM_EDIYOR' as DefterDurumu;
        } else if (now <= fiveDaysAfterEnd) {
          // Staj bitti, defter yükleme süresi içinde
          calculatedStatus = DefterDurumu.BEKLEMEDE; // "Defter Beklenenler"
        } else {
          // Defter yükleme süresi doldu
          calculatedStatus = 'SURE_DOLDU' as DefterDurumu;
        }
      }

      return {
        ...mapToResponseDTO(defter),
        defterDurumu: calculatedStatus,
        // Hesaplanan tarihler frontend için
        stajBaslangicTarihi: internshipStartDate,
        stajBitisTarihi: internshipEndDate,
        defterYuklemeSonTarihi: fiveDaysAfterEnd,
        stajDevamEdiyor: now >= internshipStartDate && now <= internshipEndDate,
        defterYuklenebilir: now > internshipEndDate && now <= fiveDaysAfterEnd
      };
    });

    return updatedDefterler;
  } catch (error) {
    // Veritabanı hatası durumunda boş array döndür, 401 hatas fırlatma
    return [];
  }
}

// Tek bir defteri ID ile getir
export async function getDefterById(defterId: number, userId: number) {
  // Input validation
  if (!defterId || defterId <= 0) {
    throw { statusCode: 400, message: 'Geçersiz defter ID.' };
  }
  if (!userId || userId <= 0) {
    throw { statusCode: 400, message: 'Geçersiz kullanıcı ID.' };
  }

  const defter = await prisma.stajDefteri.findFirst({
    where: {
      id: defterId,
      stajBasvurusu: {
        ogrenciId: userId
      }
    },
    include: {
      stajBasvurusu: {
        select: {
          id: true,
          kurumAdi: true,
          stajTipi: true,
          baslangicTarihi: true,
          bitisTarihi: true,
          onayDurumu: true
        }
      }
    }
  });

  return defter ? mapToResponseDTO(defter) : null;
}

// PDF yükleme
export async function uploadDefterPdf(uploadData: DefterPdfUploadDTO, userId: number): Promise<DefterResponseDTO> {
  DebugUtils.log(`📁 DefterService: Starting upload process for user ${userId}, basvuru ${uploadData.basvuruId}`);
  
  ValidationUtils.validateId(uploadData.basvuruId, 'Başvuru ID');
  ValidationUtils.validateId(userId, 'Kullanıcı ID');

  // Başvuruya ait olup olmadığını kontrol et
  const basvuru = await prisma.stajBasvurusu.findFirst({
    where: { 
      id: uploadData.basvuruId,
      ogrenciId: userId,
      onayDurumu: 'ONAYLANDI' // Sadece onaylanmış başvurular için defter yüklenebilir
    }
  });
  
  if (!basvuru) {
    throw new NotFoundError('Başvuru bulunamadı, onaylanmamış veya bu başvuruya erişim yetkiniz yok.');
  }
  DebugUtils.log(`📁 DefterService: Application found and approved`);

  // 5 günlük süre sınırı kontrolü - staj bitiminden 5 gün sonrasına kadar yüklenebilir
  const now = new Date();
  const internshipEndDate = new Date(basvuru.bitisTarihi);
  const fiveDaysAfterEnd = new Date(internshipEndDate);
  fiveDaysAfterEnd.setDate(fiveDaysAfterEnd.getDate() + 5);

  // Staj henüz bitmemişse yükleme yapılamaz
  if (now <= internshipEndDate) {
    throw new BadRequestError(`Staj defteri, staj bitiş tarihinden sonra yüklenebilir. Staj bitiş tarihi: ${internshipEndDate.toLocaleDateString('tr-TR')}`);
  }

  // Staj bitiminden 5 gün geçtiyse yükleme yapılamaz
  if (now > fiveDaysAfterEnd) {
    throw new BadRequestError(`Staj defteri yükleme süresi dolmuştur. Son yükleme tarihi: ${fiveDaysAfterEnd.toLocaleDateString('tr-TR')}`);
  }

  // Sadece PDF dosyalarına izin ver
  if (uploadData.mimeType !== 'application/pdf') {
    throw new BadRequestError('Sadece PDF dosyaları yüklenebilir.');
  }

  // Dosya boyutu kontrolü (50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (uploadData.file.length > maxSize) {
    throw new BadRequestError('Dosya boyutu 50MB\'dan büyük olamaz.');
  }
  DebugUtils.log(`📁 DefterService: File validation passed - Size: ${uploadData.file.length} bytes`);

  // Mevcut defteri kontrol et
  let defter = await prisma.stajDefteri.findUnique({
    where: { stajBasvurusuId: uploadData.basvuruId }
  });
  DebugUtils.log(`📁 DefterService: Existing defter check - found: ${!!defter}`);

  // Re-upload kontrolü: Eğer defter reddedilmişse yeniden yüklemeye izin ver
  const canReupload = !defter || 
    defter.defterDurumu === DefterDurumu.BEKLEMEDE ||
    defter.defterDurumu === DefterDurumu.REDDEDILDI ||
    defter.defterDurumu === DefterDurumu.SIRKET_REDDETTI ||
    defter.defterDurumu === DefterDurumu.DANISMAN_REDDETTI;

  if (defter && !canReupload) {
    throw new BadRequestError('Bu defter zaten yüklenmiş ve onay sürecinde. Yeniden yükleme yapılamaz.');
  }

  // Eski dosyayı sil (eğer varsa ve yeniden yükleme yapılıyorsa)
  if (defter?.dosyaYolu && canReupload) {
    try {
      await fs.unlink(defter.dosyaYolu);
    } catch (error) {
      // Dosya silme hatası kritik değil, devam et
    }
  }

  // Dosyayı kaydet
  const fileExtension = path.extname(uploadData.originalName);
  const fileName = `defter_${uploadData.basvuruId}_${Date.now()}${fileExtension}`;
  const uploadDir = path.resolve(__dirname, '../../uploads/defterler');
  
  DebugUtils.log(`📁 DefterService: Creating upload directory: ${uploadDir}`);
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);
  DebugUtils.log(`📁 DefterService: Writing file to: ${filePath}`);
  await fs.writeFile(filePath, uploadData.file);
  DebugUtils.log(`📁 DefterService: File written successfully`);

  // Defter oluştur veya güncelle
  if (defter) {
    defter = await prisma.stajDefteri.update({
      where: { id: defter.id },
      data: {
        dosyaYolu: filePath,
        originalFileName: uploadData.originalName,
        fileSize: uploadData.file.length,
        uploadDate: new Date(),
        defterDurumu: DefterDurumu.SIRKET_ONAYI_BEKLIYOR, // Şirket onayı bekleniyor
        redSebebi: null, // Red sebebini temizle
        sirketOnayTarihi: null, // Şirket onay tarihini temizle
        danismanOnayTarihi: null, // Danışman onay tarihini temizle
        updatedAt: new Date()
      },
      include: {
        stajBasvurusu: {
          select: {
            id: true,
            kurumAdi: true,
            stajTipi: true,
            baslangicTarihi: true,
            bitisTarihi: true,
            onayDurumu: true
          }
        }
      }
    });
  } else {
    defter = await prisma.stajDefteri.create({
      data: {
        stajBasvurusuId: uploadData.basvuruId,
        dosyaYolu: filePath,
        originalFileName: uploadData.originalName,
        fileSize: uploadData.file.length,
        uploadDate: new Date(),
        defterDurumu: DefterDurumu.SIRKET_ONAYI_BEKLIYOR // Şirket onayı bekleniyor
      },
      include: {
        stajBasvurusu: {
          select: {
            id: true,
            kurumAdi: true,
            stajTipi: true,
            baslangicTarihi: true,
            bitisTarihi: true,
            onayDurumu: true
          }
        }
      }
    });
  }

  // Şirket onayı için OTP üret ve gönder
  try {
    await generateAndSendDefterOtp(defter.id);
  } catch {
    // OTP gönderilemese bile defter yükleme işlemi tamamlanır
  }

  return mapToResponseDTO(defter);
}

// Defter durumunu güncelle
export async function updateDefterDurumu(defterId: number, userId: number, yeniDurum: DefterDurumu) {
  const defter = await getDefterById(defterId, userId);
  if (!defter) {
    throw new NotFoundError('Defter bulunamadı veya bu deftere erişim yetkiniz yok.');
  }

  return prisma.stajDefteri.update({
    where: { id: defterId },
    data: { 
      defterDurumu: yeniDurum,
      updatedAt: new Date()
    }
  });
}

// PDF dosyasını indir
export async function downloadDefterPdf(defterId: number, userId: number): Promise<{ buffer: Buffer; filename: string }> {
  const defter = await getDefterById(defterId, userId);
  if (!defter) {
    throw new NotFoundError('Defter bulunamadı veya bu deftere erişim yetkiniz yok.');
  }

  if (!defter.dosyaYolu) {
    throw new NotFoundError('Bu defter için PDF dosyası bulunamadı.');
  }

  try {
    const buffer = await fs.readFile(defter.dosyaYolu);
    return {
      buffer,
      filename: defter.originalFileName || 'staj-defteri.pdf'
    };
  } catch (error) {
    throw new NotFoundError('PDF dosyası okunurken hata oluştu.');
  }
}

// PDF dosyasını path ile indir (danışman için)
export async function downloadDefterPdfByPath(filePath: string, originalFileName?: string): Promise<{ buffer: Buffer; filename: string }> {
  if (!filePath) {
    throw new NotFoundError('PDF dosyası bulunamadı.');
  }

  try {
    const buffer = await fs.readFile(filePath);
    return {
      buffer,
      filename: originalFileName || 'staj-defteri.pdf'
    };
  } catch (error) {
    throw new NotFoundError('PDF dosyası okunurken hata oluştu.');
  }
}

// Defter silme - Danışman onayından sonra silinemez
export async function deleteDefterPdf(defterId: number, userId: number): Promise<void> {
  const defter = await getDefterById(defterId, userId);
  if (!defter) {
    throw new NotFoundError('Defter bulunamadı veya bu deftere erişim yetkiniz yok.');
  }

  // Danışman onayından sonra defter silinemez
  if (defter.defterDurumu === DefterDurumu.ONAYLANDI || 
      defter.defterDurumu === DefterDurumu.DANISMAN_REDDETTI ||
      defter.defterDurumu === DefterDurumu.SIRKET_REDDETTI) {
    throw new BadRequestError('Onaylanan veya reddedilen defterler silinemez.');
  }

  // Dosyayı sil
  if (defter.dosyaYolu) {
    try {
      await fs.unlink(defter.dosyaYolu);
    } catch (error) {
      // Dosya silme hatası kritik değil, devam et
    }
  }

  // Defter kaydını güncelle
  await prisma.stajDefteri.update({
    where: { id: defterId },
    data: {
      dosyaYolu: null,
      originalFileName: null,
      fileSize: null,
      uploadDate: null,
      defterDurumu: DefterDurumu.BEKLEMEDE,
      updatedAt: new Date()
    }
  });
}

// Şirket defter onayı için OTP üretme ve gönderme (basitleştirilmiş)
export async function generateAndSendDefterOtp(defterId: number) {
  try {
    const defter = await prisma.stajDefteri.findUnique({
      where: { id: defterId },
      include: {
        stajBasvurusu: {
          include: {
            ogrenci: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!defter) {
      throw new NotFoundError('Defter bulunamadı');
    }

    if (defter.defterDurumu !== DefterDurumu.SIRKET_ONAYI_BEKLIYOR) {
      return { success: false, message: 'Defter şirket onayı beklemiyor' };
    }

  // 8 haneli OTP üret
  // Generate a random 8-digit number between 10000000 and 99999999
  const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
  const otpExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 gün geçerli

    // OTP'yi veritabanına kaydet
    await prisma.stajDefteri.update({
      where: { id: defterId },
      data: {
        sirketDefterOtp: otp,
        sirketDefterOtpExpires: otpExpires
      }
    });

    // E-postayı küçük harfe çevir ve boşlukları temizle
    const temizEmail = defter.stajBasvurusu.sorumluMail.toLowerCase().trim();

    // Şirkete OTP maili gönder
    await sendDefterSirketOtpMail(
      temizEmail,
      otp,
      defterId,
      defter.stajBasvurusu.kurumAdi,
      defter.stajBasvurusu.ogrenci.name || ''
    );
    return { success: true, message: 'Defter OTP gönderildi' };

  } catch (error) {
    throw error;
  }
}

// Şirket defter onayı
export async function sirketDefterOnay(
  defterId: number,
  email: string, 
  otp: string, 
  onayDurumu: 'ONAYLANDI' | 'REDDEDILDI',
  redSebebi?: string
) {
  try {
    // OTP doğrulama ve defter bilgilerini getir
    const defter = await prisma.stajDefteri.findFirst({
      where: {
        id: defterId,
        sirketDefterOtp: otp.trim(),
        sirketDefterOtpExpires: {
          gte: new Date() // OTP henüz süresi dolmamış olmalı
        },
        defterDurumu: 'SIRKET_ONAYI_BEKLIYOR' as DefterDurumu,
        stajBasvurusu: {
          sorumluMail: email.toLowerCase().trim()
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
      throw new BadRequestError('Geçersiz OTP veya süre dolmuş');
    }

    // Defter durumunu güncelle
    const yeniDurum = onayDurumu === 'ONAYLANDI' 
      ? 'DANISMAN_ONAYI_BEKLIYOR' as DefterDurumu 
      : 'SIRKET_REDDETTI' as DefterDurumu;

    const updatedDefter = await prisma.stajDefteri.update({
      where: { id: defterId },
      data: {
        defterDurumu: yeniDurum,
        sirketDefterOtp: null, // OTP'yi temizle
        sirketDefterOtpExpires: null,
        sirketOnayTarihi: onayDurumu === 'ONAYLANDI' ? new Date() : null,
        redSebebi: onayDurumu === 'REDDEDILDI' ? redSebebi : null, // Legacy field - sadece red için
        sirketAciklama: onayDurumu === 'ONAYLANDI' ? (redSebebi || 'Şirket tarafından onaylandı') : (redSebebi || null), // New field - onayda açıklama, redde sebep
        sirketOnayDurumu: onayDurumu === 'ONAYLANDI' ? 1 : -1 // New field: 1 approved, -1 rejected
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

    // Log kaydı MongoDB'ye ekle
    const logger = LoggerService.getInstance();
    await logger.log(null, {
      action: onayDurumu === 'ONAYLANDI' ? LogAction.DEFTER_SIRKET_ONAYLADI : LogAction.DEFTER_SIRKET_REDDETTI,
      level: LogLevel.INFO,
      details: {
        action: onayDurumu === 'ONAYLANDI' ? 'defter_sirket_onayladi' : 'defter_sirket_reddetti',
        defterId: defterId,
        basvuruId: defter.stajBasvurusuId,
        redSebebi: redSebebi || (onayDurumu === 'ONAYLANDI' ? 'Şirket tarafından onaylandı' : 'Şirket tarafından reddedildi'),
        timestamp: new Date().toISOString()
      }
    });

    // Onay/red sonrası öğrenciye bilgilendirme maili gönder
    try {
      if (onayDurumu === 'ONAYLANDI') {
        // Danışman onayına geçti bildirimi
        // TODO: Özel mail template'i eklenebilir - şimdilik genel bilgilendirme
      } else {
        // Red bildirimi
        const { sendDefterRedBildirimMail } = await import('../utils/mailer.js');
        await sendDefterRedBildirimMail(
          defter.stajBasvurusu.ogrenci.email || '',
          defter.stajBasvurusu.ogrenci.name || '',
          defter.stajBasvurusu.kurumAdi,
          defterId,
          redSebebi || 'Şirket tarafından reddedildi'
        );
      }
    } catch {
    }

    return {
      success: true,
      message: `Defter ${onayDurumu === 'ONAYLANDI' ? 'onaylandı ve danışman onayına gönderildi' : 'reddedildi'}`,
      data: await (async () => {
        try {
          // fetch basvuru to inspect CAP flags and student details
          const basvuru = await prisma.stajBasvurusu.findUnique({
            where: { id: updatedDefter.stajBasvurusuId },
            select: {
              id: true,
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
              isCapBasvuru: true,
              capFakulte: true,
              capBolum: true,
              capDepartman: true,
              danismanMail: true
            }
          });

          if (!basvuru) return updatedDefter;

          let facultyValue = basvuru.ogrenci?.faculty ?? 'Bilgi bulunamadı';
          let classValue = basvuru.ogrenci?.class ?? 'Bilgi bulunamadı';
          let capDepartmanValue: string | null = null;
          let capDanismanValue: any = null;

          if (basvuru.isCapBasvuru) {
            try {
              let capRecord: any = null;
              try {
                capRecord = await prisma.capUser.findFirst({
                  where: {
                    ogrenci: { studentId: basvuru.ogrenci?.studentId },
                    capDanisman: { email: basvuru.danismanMail ?? undefined }
                  },
                  select: {
                    capFakulte: true,
                    capBolum: true,
                    capDepartman: true,
                    capDanisman: { select: { id: true, name: true, email: true } }
                  }
                });
              } catch (e) {
                capRecord = null;
              }

              if (!capRecord) {
                capRecord = await prisma.capUser.findFirst({
                  where: { ogrenciId: basvuru.ogrenci?.id },
                  select: {
                    capFakulte: true,
                    capBolum: true,
                    capDepartman: true,
                    capDanisman: { select: { id: true, name: true, email: true } }
                  }
                });
              }

              if (capRecord) {
                facultyValue = basvuru.capFakulte ?? capRecord.capFakulte ?? facultyValue;
                classValue = capRecord.capBolum && capRecord.capDepartman
                  ? `${capRecord.capBolum} - ${capRecord.capDepartman}`
                  : capRecord.capBolum ?? classValue;
                capDepartmanValue = basvuru.capDepartman ?? capRecord.capDepartman ?? null;
                capDanismanValue = capRecord.capDanisman ?? null;
              }
            } catch (err) {
              // ignore cap lookup errors
              console.error('CAP lookup error in sirketDefterOnay augmentation:', err);
            }
          }

          // build augmented response
          const augmented = {
            ...updatedDefter,
            stajBasvurusu: {
              ...updatedDefter.stajBasvurusu,
              ogrenci: {
                id: basvuru.ogrenci?.id || updatedDefter.stajBasvurusu?.ogrenci?.id || 0,
                name: basvuru.ogrenci?.name || updatedDefter.stajBasvurusu?.ogrenci?.name || null,
                email: basvuru.ogrenci?.email || updatedDefter.stajBasvurusu?.ogrenci?.email || null,
                studentId: basvuru.ogrenci?.studentId || null,
                faculty: facultyValue,
                class: classValue,
                capDepartman: capDepartmanValue,
                capDanisman: capDanismanValue
              }
            }
          } as any;

          return augmented;
        } catch (e) {
          return updatedDefter;
        }
      })
    };

  } catch (error) {
    throw error;
  }
}

// Response DTO dönüştürücü
function mapToResponseDTO(defter: Record<string, unknown>): DefterResponseDTO {
  return {
    id: defter.id as number,
    stajBasvurusuId: defter.stajBasvurusuId as number,
    dosyaYolu: defter.dosyaYolu as string | undefined,
    originalFileName: defter.originalFileName as string | undefined,
    fileSize: defter.fileSize as number | undefined,
    uploadDate: defter.uploadDate as Date | undefined,
    defterDurumu: defter.defterDurumu as string,
    createdAt: defter.createdAt as Date,
    updatedAt: defter.updatedAt as Date,
    stajBasvurusu: defter.stajBasvurusu as { id: number; kurumAdi: string; stajTipi: string; baslangicTarihi: Date; bitisTarihi: Date; onayDurumu: string; } | undefined
  };
}
