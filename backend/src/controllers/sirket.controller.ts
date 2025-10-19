import { DebugUtils } from '../utils/debug.utils.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import path from 'path';
import fs from 'fs';
import LoggerService, { LogAction, LogLevel } from '../services/logger.service.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/error.utils.js';

// OTP üretme ve gönderme fonksiyonu
export async function generateAndSendOtp(basvuruId: number) {
  const logger = LoggerService.getInstance();
  
  await logger.log(null, {
    action: LogAction.OTP_SENT,
    level: LogLevel.INFO,
    details: {
      action: 'company_otp_generation_started',
      basvuruId,
      timestamp: new Date().toISOString()
    }
  });

  try {
    const basvuru = await prisma.stajBasvurusu.findUnique({
      where: { id: basvuruId },
      include: {
        ogrenci: {
          select: {
            name: true
          }
        }
      }
    });

    if (!basvuru) {
      throw new Error('Başvuru bulunamadı');
    }

    await logger.log(null, {
      action: LogAction.BASVURU_VIEW,
      level: LogLevel.INFO,
      details: {
        action: 'company_otp_basvuru_found',
        basvuruId: basvuru.id,
        kurumAdi: basvuru.kurumAdi,
        sorumluMail: basvuru.sorumluMail,
        ogrenciAdi: basvuru.ogrenci.name
      }
    });

  // 8 haneli OTP üret
  // Generate a random 8-digit number between 10000000 and 99999999
  const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
    const otpExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 gün geçerli

    await logger.log(null, {
      action: LogAction.OTP_SENT,
      level: LogLevel.INFO,
      details: {
        action: 'company_otp_generated',
        basvuruId,
        otpExpires: otpExpires.toISOString(),
        otpLength: otp.length
      }
    });

    // OTP'yi veritabanına kaydet
    await prisma.stajBasvurusu.update({
      where: { id: basvuruId },
      data: {
        sirketOtp: otp,
        sirketOtpExpires: otpExpires
      }
    });

    await logger.log(null, {
      action: LogAction.OTP_SENT,
      level: LogLevel.INFO,
      details: {
        action: 'company_otp_saved_to_database',
        basvuruId
      }
    });

    // E-postayı küçük harfe çevir ve boşlukları temizle
    const temizEmail = basvuru.sorumluMail.toLowerCase().trim();

    await logger.log(null, {
      action: LogAction.EMAIL_SENT,
      level: LogLevel.INFO,
      details: {
        action: 'company_otp_email_sending',
        targetEmail: temizEmail,
        basvuruId
      }
    });

    // Şirkete OTP maili gönder
    const { sendCompanyOtpMail } = await import('../utils/mailer.js');
    await sendCompanyOtpMail(
      temizEmail,
      otp,
      basvuruId,
      basvuru.kurumAdi,
      basvuru.ogrenci.name ?? ''
    );

    await logger.log(null, {
      action: LogAction.OTP_SENT,
      level: LogLevel.INFO,
      details: {
        action: 'company_otp_sent_successfully',
        basvuruId,
        targetEmail: temizEmail
      }
    });
    
    return { success: true, message: 'OTP gönderildi' };

  } catch (error) {
    await logger.log(null, {
      action: LogAction.API_ERROR,
      level: LogLevel.ERROR,
      details: {
        action: 'company_otp_generation_failed',
        basvuruId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

// Şirket OTP giriş endpoint
interface SirketGirisRequest {
  Body: {
    email: string;
    otp: string;
  };
}

export async function sirketGiris(request: FastifyRequest, reply: FastifyReply) {
  const logger = LoggerService.getInstance();
  let email = '';
  
  try {
    const { email: requestEmail, otp } = request.body as { email: string; otp: string };
    email = requestEmail;

    await logger.log(request, {
      action: LogAction.LOGIN,
      level: LogLevel.INFO,
      userEmail: email,
      details: {
        action: 'company_login_attempt',
        email,
        otpLength: otp?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

    if (!email || !otp) {
      await logger.logSecurity(request, LogAction.LOGIN_FAILED, {
        action: 'company_verification_failed',
        reason: 'missing_email_or_otp',
        email: email || 'missing',
        hasOtp: !!otp
      }, email);
      
      throw new BadRequestError('Email ve OTP gereklidir');
    }

    // İlk olarak başvuru OTP'sini kontrol et
    const basvuru = await prisma.stajBasvurusu.findFirst({
      where: {
        sorumluMail: email.toLowerCase().trim(),
        sirketOtp: otp.trim(),
        sirketOtpExpires: {
          gte: new Date() // OTP henüz süresi dolmamış olmalı
        },
        onayDurumu: 'SIRKET_ONAYI_BEKLIYOR' // Sadece şirket onayı bekleyen başvurular
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

    if (basvuru) {
      // Başvuru onayı için giriş başarılı
      await logger.log(request, {
        action: LogAction.LOGIN,
        level: LogLevel.INFO,
        userEmail: email,
        userType: 'COMPANY',
        details: {
          action: 'company_login_success_basvuru',
          basvuruId: basvuru.id,
          kurumAdi: basvuru.kurumAdi,
          ogrenciId: basvuru.ogrenci?.id,
          ogrenciName: basvuru.ogrenci?.name,
          type: 'basvuru'
        },
        statusCode: 200
      });
      
      // Prefer CAP fields when this is a CAP başvurusu
      let facultyValue = basvuru.ogrenci?.faculty || 'Bilgi bulunamadı';
      let classValue = basvuru.ogrenci?.class || 'Bilgi bulunamadı';
      let capDepartmanValue: string | null = null;
      let capDanismanValue: any = null;

      if (basvuru.isCapBasvuru) {
        try {
          // Try to find capUser using studentId + capDanisman email, then fallbacks similar to danisman.service
          let capRecord: any = null;
          try {
            capRecord = await prisma.capUser.findFirst({
              where: {
                ogrenci: { studentId: basvuru.ogrenci.studentId },
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
              where: {
                ogrenciId: basvuru.ogrenciId,
                capDanisman: { email: basvuru.danismanMail ?? undefined }
              },
              select: {
                capFakulte: true,
                capBolum: true,
                capDepartman: true,
                capDanisman: { select: { id: true, name: true, email: true } }
              }
            });
          }

          if (!capRecord) {
            capRecord = await prisma.capUser.findFirst({
              where: { ogrenciId: basvuru.ogrenciId },
              select: {
                capFakulte: true,
                capBolum: true,
                capDepartman: true,
                capDanisman: { select: { id: true, name: true, email: true } }
              }
            });
          }

          if (capRecord) {
            // Use cap-specific faculty if provided on the basvuru or capRecord
            facultyValue = basvuru.capFakulte ?? capRecord.capFakulte ?? facultyValue;
            // Build class from capBolum and capDepartman when possible
            classValue = capRecord.capBolum && capRecord.capDepartman
              ? `${capRecord.capBolum} - ${capRecord.capDepartman}`
              : capRecord.capBolum ?? classValue;
            capDepartmanValue = basvuru.capDepartman ?? capRecord.capDepartman ?? null;
            capDanismanValue = capRecord.capDanisman ?? null;
          }
        } catch (err) {
          // ignore CAP lookup errors and fall back to normal fields
          console.error('CAP lookup error in company basvuru response:', err);
        }
      }

      const responseData = {
        type: 'basvuru', // Başvuru onayı olduğunu belirt
        basvuru: {
          id: basvuru.id,
          kurumAdi: basvuru.kurumAdi,
          kurumAdresi: basvuru.kurumAdresi,
          sorumluTelefon: basvuru.sorumluTelefon,
          toplamGun: basvuru.toplamGun,
          danismanMail: basvuru.danismanMail,
          transkriptDosyasi: basvuru.transkriptDosyasi,
          hizmetDokumu: basvuru.hizmetDokumu,
          sigortaDosyasi: basvuru.sigortaDosyasi,
          ogrenci: {
            id: basvuru.ogrenci?.id || 0,
            name: basvuru.ogrenci?.name || 'Öğrenci Adı Bulunamadı',
            email: basvuru.ogrenci?.email || '',
            studentId: basvuru.ogrenci?.studentId || '',
            faculty: facultyValue,
            class: classValue,
            capDepartman: capDepartmanValue,
            capDanisman: capDanismanValue
          },
          stajTipi: basvuru.stajTipi,
          baslangicTarihi: basvuru.baslangicTarihi,
          bitisTarihi: basvuru.bitisTarihi,
          onayDurumu: basvuru.onayDurumu,
          sorumluMail: basvuru.sorumluMail,
          yetkiliAdi: basvuru.yetkiliAdi,
          yetkiliUnvani: basvuru.yetkiliUnvani
        }
      };

      return reply.send({
        data: responseData,
        success: true,
        message: 'Başvuru onayı için giriş başarılı'
      });
    }

    // Başvuru OTP'si bulunamadıysa, defter OTP'sini kontrol et
  const defter = await prisma.stajDefteri.findFirst({
      where: {
        sirketDefterOtp: otp.trim(),
        sirketDefterOtpExpires: {
          gte: new Date()
        },
        defterDurumu: 'SIRKET_ONAYI_BEKLIYOR',
        stajBasvurusu: {
          sorumluMail: email.toLowerCase().trim()
        }
      },
      include: {
        stajBasvurusu: {
          select: {
            id: true,
            kurumAdi: true,
            kurumAdresi: true,
            danismanMail: true,
            stajTipi: true,
            baslangicTarihi: true,
            bitisTarihi: true,
            sorumluMail: true,
            yetkiliAdi: true,
            yetkiliUnvani: true,
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
                class: true
              }
            }
          }
        }
      }
    });

    if (defter) {
      // Defter onayı için giriş başarılı
      await logger.log(request, {
        action: LogAction.LOGIN,
        level: LogLevel.INFO,
        userEmail: email,
        userType: 'COMPANY',
        details: {
          action: 'company_login_success_defter',
          defterId: defter.id,
          basvuruId: defter.stajBasvurusu.id,
          kurumAdi: defter.stajBasvurusu.kurumAdi,
          ogrenciId: defter.stajBasvurusu.ogrenci?.id,
          ogrenciName: defter.stajBasvurusu.ogrenci?.name,
          type: 'defter'
        },
        statusCode: 200
      });
      
      // Prefer CAP fields when the related basvuru is a CAP başvurusu
      let facultyVal = defter.stajBasvurusu.ogrenci?.faculty || 'Bilgi bulunamadı';
  let classVal = defter.stajBasvurusu?.ogrenci?.class || 'Bilgi bulunamadı';
      let capDep: string | null = null;
      let capDanisman: any = null;

      try {
        const basvuruRec = defter.stajBasvurusu as any;
        if (basvuruRec?.isCapBasvuru) {
          // attempt to fetch capUser like above
          let capRecord: any = null;
          try {
            capRecord = await prisma.capUser.findFirst({
              where: {
                ogrenci: { studentId: basvuruRec.ogrenci.studentId },
                capDanisman: { email: basvuruRec.danismanMail ?? undefined }
              },
              select: { capFakulte: true, capBolum: true, capDepartman: true, capDanisman: { select: { id: true, name: true, email: true } } }
            });
          } catch (e) {
            capRecord = null;
          }

          if (!capRecord) {
            capRecord = await prisma.capUser.findFirst({ where: { ogrenciId: basvuruRec.ogrenciId }, select: { capFakulte: true, capBolum: true, capDepartman: true, capDanisman: { select: { id: true, name: true, email: true } } } });
          }

          if (capRecord) {
            facultyVal = basvuruRec.capFakulte ?? capRecord.capFakulte ?? facultyVal;
            classVal = capRecord.capBolum && capRecord.capDepartman ? `${capRecord.capBolum} - ${capRecord.capDepartman}` : capRecord.capBolum ?? classVal;
            capDep = basvuruRec.capDepartman ?? capRecord.capDepartman ?? null;
            capDanisman = capRecord.capDanisman ?? null;
          }
        }
      } catch (e) {
        console.error('CAP lookup error in company defter response:', e);
      }

      const responseData = {
        type: 'defter', // Defter onayı olduğunu belirt
        defter: {
          id: defter.id,
          dosyaYolu: defter.dosyaYolu,
          defterDurumu: defter.defterDurumu,
          basvuru: {
            id: defter.stajBasvurusu.id,
            kurumAdi: defter.stajBasvurusu.kurumAdi,
            kurumAdresi: defter.stajBasvurusu.kurumAdresi,
            ogrenci: {
              id: defter.stajBasvurusu.ogrenci?.id || 0,
              name: defter.stajBasvurusu.ogrenci?.name || 'Öğrenci Adı Bulunamadı',
              email: defter.stajBasvurusu.ogrenci?.email || '',
              studentId: defter.stajBasvurusu.ogrenci?.studentId || '',
              faculty: facultyVal,
              class: classVal,
              capDepartman: capDep,
              capDanisman: capDanisman
            },
            stajTipi: defter.stajBasvurusu.stajTipi,
            baslangicTarihi: defter.stajBasvurusu.baslangicTarihi,
            bitisTarihi: defter.stajBasvurusu.bitisTarihi,
            sorumluMail: defter.stajBasvurusu.sorumluMail,
            yetkiliAdi: defter.stajBasvurusu.yetkiliAdi,
            yetkiliUnvani: defter.stajBasvurusu.yetkiliUnvani
          }
        }
      };

      return reply.send({
        data: responseData,
        success: true,
        message: 'Defter onayı için giriş başarılı'
      });
    }

    // Her iki OTP de bulunamadıysa hata döndür
    await logger.log(request, {
      action: LogAction.LOGIN_FAILED,
      level: LogLevel.WARN,
      userEmail: email,
      userType: 'COMPANY',
      details: {
        action: 'company_login_failed',
        reason: 'invalid_otp_or_expired',
        email,
        otpAttempted: otp.length
      },
      statusCode: 401
    });
    
    // Debug için mevcut kayıtları kontrol et
    const mevcutBasvuru = await prisma.stajBasvurusu.findFirst({
      where: { sorumluMail: email.toLowerCase().trim() },
      select: { 
        id: true, 
        sirketOtp: true, 
        sirketOtpExpires: true,
        onayDurumu: true
      }
    });
    
    const mevcutDefter = await prisma.stajDefteri.findFirst({
      where: {
        stajBasvurusu: {
          sorumluMail: email.toLowerCase().trim()
        }
      },
      select: {
        id: true,
        sirketDefterOtp: true,
        sirketDefterOtpExpires: true,
        defterDurumu: true
      }
    });
    
    return reply.status(401).send({
      success: false,
      message: 'Geçersiz email veya OTP, ya da OTP süresi dolmuş'
    });

  } catch (error) {
    await logger.logError(request, error as Error, email, 'COMPANY');
    return reply.status(500).send({
      success: false,
      message: 'Sunucu hatası'
    });
  }
}

// Şirket onay endpoint
interface SirketOnayRequest {
  Body: {
    basvuruId: number;
    email: string;
    otp: string;
    onayDurumu: 'ONAYLANDI' | 'REDDEDILDI';
    redSebebi?: string;
  };
}

export async function sirketOnay(request: FastifyRequest<SirketOnayRequest>, reply: FastifyReply) {
  const logger = LoggerService.getInstance();
  let email = '';
  
  try {
    const { basvuruId, email: requestEmail, otp, onayDurumu, redSebebi } = request.body;
    email = requestEmail;

    await logger.log(request, {
      action: onayDurumu === 'ONAYLANDI' ? LogAction.SIRKET_ONAYLADI : LogAction.SIRKET_REDDETTI,
      level: LogLevel.INFO,
      userEmail: email,
      userType: 'COMPANY',
      details: {
        action: 'company_approval_attempt',
        basvuruId,
        onayDurumu,
        redSebebi: redSebebi || null,
        timestamp: new Date().toISOString()
      }
    });

    if (!basvuruId || !email || !otp || !onayDurumu) {
      await logger.log(request, {
        action: LogAction.VALIDATION_ERROR,
        level: LogLevel.WARN,
        userEmail: email,
        userType: 'COMPANY',
        details: {
          action: 'company_approval_validation_failed',
          missingFields: {
            basvuruId: !basvuruId,
            email: !email,
            otp: !otp,
            onayDurumu: !onayDurumu
          }
        },
        statusCode: 400
      });
      
      return reply.status(400).send({
        success: false,
        message: 'Tüm alanlar gereklidir'
      });
    }

    // OTP doğrulama ve başvuru bilgilerini öğrenci bilgileriyle birlikte getir
    const basvuru = await prisma.stajBasvurusu.findFirst({
      where: {
        id: basvuruId,
        sorumluMail: email.toLowerCase().trim(),
        sirketOtp: otp.trim(),
        sirketOtpExpires: {
          gte: new Date() // OTP henüz süresi dolmamış olmalı
        },
        onayDurumu: 'SIRKET_ONAYI_BEKLIYOR' // Sadece şirket onayı bekleyen başvurular
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
      await logger.log(request, {
        action: LogAction.UNAUTHORIZED_ACCESS,
        level: LogLevel.WARN,
        userEmail: email,
        userType: 'COMPANY',
        details: {
          action: 'company_approval_unauthorized',
          reason: 'invalid_otp_or_expired',
          basvuruId,
          email
        },
        statusCode: 401
      });
      
      return reply.status(401).send({
        success: false,
        message: 'Geçersiz OTP veya süre dolmuş'
      });
    }

    // Başvuru durumunu güncelle
    const updatedBasvuru = await prisma.stajBasvurusu.update({
      where: { id: basvuruId },
      data: {
        onayDurumu: onayDurumu,
        sirketOtp: null, // OTP'yi temizle
        sirketOtpExpires: null,
        iptalSebebi: redSebebi || null, // Legacy field
        sirketAciklama: redSebebi || (onayDurumu === 'ONAYLANDI' ? 'Şirket tarafından onaylandı' : null), // New field
        sirketOnayDurumu: onayDurumu === 'ONAYLANDI' ? 1 : -1 // New field: 1 approved, -1 rejected
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

    // Log kaydı MongoDB'ye ekle (BasvuruLog tablosu yerine)
    await logger.log(request, {
      action: onayDurumu === 'ONAYLANDI' ? LogAction.SIRKET_ONAYLADI : LogAction.SIRKET_REDDETTI,
      level: LogLevel.INFO,
      userEmail: email,
      userType: 'COMPANY',
      details: {
        action: 'company_approval_action_logged',
        stajBasvurusuId: basvuruId,
        actionType: onayDurumu === 'ONAYLANDI' ? 'SIRKET_ONAYLADI' : 'SIRKET_REDDETTI',
        detaylar: redSebebi || null,
        timestamp: new Date().toISOString()
      }
    });

    // MongoDB logging for the approval/rejection
    await logger.log(request, {
      action: onayDurumu === 'ONAYLANDI' ? LogAction.SIRKET_ONAYLADI : LogAction.SIRKET_REDDETTI,
      level: LogLevel.INFO,
      userEmail: email,
      userType: 'COMPANY',
      details: {
        action: onayDurumu === 'ONAYLANDI' ? 'company_approval_success' : 'company_rejection_success',
        basvuruId,
        onayDurumu,
        redSebebi: redSebebi || null,
        ogrenciId: basvuru.ogrenci.id,
        ogrenciName: basvuru.ogrenci.name,
        ogrenciEmail: basvuru.ogrenci.email,
        kurumAdi: basvuru.kurumAdi
      },
      statusCode: 200
    });

    // Onay/red sonrası öğrenciye bilgilendirme maili gönder
    try {
      if (onayDurumu === 'ONAYLANDI') {
        const { sendSirketOnayBildirimMail, sendSirketOnayBildirimKariyerMail } = await import('../utils/mailer.js');
        
        // Öğrenciye bilgilendirme
        await sendSirketOnayBildirimMail(
          basvuru.ogrenci.email ?? '',
          basvuru.ogrenci.name ?? '',
          basvuru.kurumAdi,
          basvuruId,
          basvuru.baslangicTarihi,
          basvuru.bitisTarihi
        );
        
        // Kariyer merkezine bilgilendirme
        await sendSirketOnayBildirimKariyerMail(
          basvuru.ogrenci.name ?? '',
          basvuru.kurumAdi,
          basvuruId
        );
        
        await logger.log(request, {
          action: LogAction.EMAIL_SENT,
          level: LogLevel.INFO,
          userEmail: email,
          userType: 'COMPANY',
          details: {
            action: 'company_approval_notifications_sent',
            basvuruId,
            sentToStudent: basvuru.ogrenci.email,
            sentToCareerCenter: true
          }
        });
      } else {
        const { sendRedBildirimMail, sendSirketRedBildirimKariyerMail } = await import('../utils/mailer.js');
        
        // Öğrenciye bilgilendirme
        await sendRedBildirimMail(
          basvuru.ogrenci.email ?? '',
          basvuru.ogrenci.name ?? '',
          basvuru.kurumAdi,
          basvuruId,
          redSebebi || 'Şirket tarafından reddedildi',
          'Şirket'
        );
        
        // Kariyer merkezine bilgilendirme
        await sendSirketRedBildirimKariyerMail(
          basvuru.ogrenci.name ?? '',
          basvuru.kurumAdi,
          basvuruId,
          redSebebi || 'Şirket tarafından reddedildi'
        );
        
        await logger.log(request, {
          action: LogAction.EMAIL_SENT,
          level: LogLevel.INFO,
          userEmail: email,
          userType: 'COMPANY',
          details: {
            action: 'company_rejection_notifications_sent',
            basvuruId,
            sentToStudent: basvuru.ogrenci.email,
            sentToCareerCenter: true,
            reason: redSebebi || 'Şirket tarafından reddedildi'
          }
        });
      }
    } catch (error) {
      await logger.log(request, {
        action: LogAction.EMAIL_FAILED,
        level: LogLevel.ERROR,
        userEmail: email,
        userType: 'COMPANY',
        details: {
          action: 'company_approval_notifications_failed',
          basvuruId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      // Mail gönderilemese bile onay/red işlemi tamamlanır
    }

    reply.send({
      success: true,
      message: `Başvuru ${onayDurumu === 'ONAYLANDI' ? 'onaylandı' : 'reddedildi'}`,
      data: updatedBasvuru
    });

  } catch (error) {
    await logger.logError(request, error as Error, email, 'COMPANY');
    reply.status(500).send({
      success: false,
      message: 'Sunucu hatası'
    });
  }
}

// Şirket defter onayı endpoint
interface SirketDefterOnayRequest {
  Body: {
    defterId: number;
    email: string;
    otp: string;
    onayDurumu: 'ONAYLANDI' | 'REDDEDILDI';
    redSebebi?: string;
  };
}

export async function sirketDefterOnay(request: FastifyRequest<SirketDefterOnayRequest>, reply: FastifyReply) {
  const logger = LoggerService.getInstance();
  
  try {
    const { defterId, email, otp, onayDurumu, redSebebi } = request.body;

    if (!defterId || !email || !otp || !onayDurumu) {
      return reply.status(400).send({
        success: false,
        message: 'Tüm alanlar gereklidir'
      });
    }

    const { sirketDefterOnay } = await import('../services/defter.service.js');
    const result = await sirketDefterOnay(defterId, email, otp, onayDurumu, redSebebi);

    reply.send(result);

  } catch (error) {
    await logger.logError(request, error as Error);
    reply.status(500).send({
      success: false,
      message: error instanceof Error ? error.message : 'Sunucu hatası'
    });
  }
}

// Test OTP gönderme endpoint (development için)
interface TestOtpRequest {
  Body: {
    basvuruId: number;
  };
}

export async function testOtpGonder(request: FastifyRequest<TestOtpRequest>, reply: FastifyReply) {
  try {
    const { basvuruId } = request.body;
    
    if (!basvuruId) {
      return reply.status(400).send({
        success: false,
        message: 'Başvuru ID gereklidir'
      });
    }

    const result = await generateAndSendOtp(basvuruId);
    
    reply.send({
      success: true,
      message: 'OTP gönderildi',
      data: result
    });

  } catch (error) {
    console.error('Test OTP gönderme hatası:', error);
    reply.status(500).send({
      success: false,
      message: error instanceof Error ? error.message : 'Sunucu hatası'
    });
  }
}

// Şirket dosya indirme endpoint'i
// NOT: Bu endpoint sadece email ve otp query parametreleri ile çalışır, Authorization header beklemez.
export async function sirketDosyaIndir(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Authorization header varsa yok say
    if (request.headers['authorization']) {
      delete request.headers['authorization'];
    }
    const { basvuruId, fileType } = request.params as { basvuruId: string; fileType: string };
    const { email, otp } = request.query as { email: string; otp: string };

    DebugUtils.log(`🔍 [SIRKET_DOSYA] Parametreler:`, { basvuruId, fileType, email: email ? 'var' : 'yok', otp: otp ? 'var' : 'yok' });

    if (!email || !otp) {
      return reply.status(400).send({ success: false, message: 'Email ve OTP gereklidir' });
    }

    // Defter dosyası için özel kontrol
    if (fileType === 'defter') {
      // Defter onayı için giriş kontrolü
      const defter = await prisma.stajDefteri.findFirst({
        where: {
          sirketDefterOtp: otp.trim(),
          sirketDefterOtpExpires: { gte: new Date() },
          defterDurumu: 'SIRKET_ONAYI_BEKLIYOR',
          stajBasvurusu: {
            sorumluMail: email.toLowerCase().trim()
          }
        },
        include: {
          stajBasvurusu: true
        }
      });
      
      if (!defter) {
        return reply.status(401).send({ success: false, message: 'Defter için geçersiz email, OTP veya başvuru' });
      }
      
      const dosyaYolu = defter.dosyaYolu || '';
      const dosyaAdi = 'staj_defteri.pdf';
      
      if (!dosyaYolu) {
        return reply.status(404).send({ success: false, message: 'Defter dosyası bulunamadı' });
      }

      // Dosya yolu kontrolü
      let fullPath: string;
      if (path.isAbsolute(dosyaYolu)) {
        fullPath = dosyaYolu;
      } else {
        fullPath = path.join(process.cwd(), 'uploads', dosyaYolu);
      }
      
      DebugUtils.log(`📁 [SIRKET_DOSYA] Defter dosya yolu: ${fullPath}`);
      
      if (!fs.existsSync(fullPath)) {
        DebugUtils.log(`❌ [SIRKET_DOSYA] Defter dosyası bulunamadı: ${fullPath}`);
        return reply.status(404).send({ success: false, message: 'Defter dosyası sistemde bulunamadı' });
      }
      
      DebugUtils.log(`✅ [SIRKET_DOSYA] Defter dosyası bulundu, gönderiliyor: ${fullPath}`);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${dosyaAdi}"`);
      const stream = fs.createReadStream(fullPath);
      return reply.send(stream);
    }

    // Başvuru dosyaları için normal kontrol
    const basvuru = await prisma.stajBasvurusu.findFirst({
      where: {
        id: Number(basvuruId),
        sorumluMail: email.toLowerCase().trim(),
        sirketOtp: otp.trim(),
        sirketOtpExpires: { gte: new Date() },
      },
    });
    if (!basvuru) {
      return reply.status(401).send({ success: false, message: 'Geçersiz email, OTP veya başvuru' });
    }

    // Dosya yolu ve isim kontrolü
    let dosyaYolu = '';
    let dosyaAdi = '';
    if (fileType === 'transkript') {
      dosyaYolu = basvuru.transkriptDosyasi || '';
      dosyaAdi = 'transkript.pdf';
    } else if (fileType === 'hizmet') {
      dosyaYolu = basvuru.hizmetDokumu || '';
      dosyaAdi = 'hizmet_dokumu.pdf';
    } else if (fileType === 'sigorta') {
      dosyaYolu = basvuru.sigortaDosyasi || '';
      dosyaAdi = 'sigorta_belgesi.pdf';
    } else if (fileType === 'defter') {
      // Defter dosyası için özel kontrol - defter tablosundan al
      const defter = await prisma.stajDefteri.findFirst({
        where: {
          stajBasvurusuId: Number(basvuruId),
          sirketDefterOtp: otp.trim(),
          sirketDefterOtpExpires: { gte: new Date() }
        }
      });
      
      if (!defter) {
        return reply.status(401).send({ success: false, message: 'Defter için geçersiz OTP' });
      }
      
      dosyaYolu = defter.dosyaYolu || '';
      dosyaAdi = 'staj_defteri.pdf';
    } else {
      return reply.status(400).send({ success: false, message: 'Geçersiz dosya türü' });
    }

    if (!dosyaYolu) {
      return reply.status(404).send({ success: false, message: 'Dosya bulunamadı' });
    }

    // Dosya yolu kontrolü - eğer tam path ise olduğu gibi kullan, değilse uploads klasörüyle birleştir
    let fullPath: string;
    if (path.isAbsolute(dosyaYolu)) {
      // Tam path verilmişse direkt kullan
      fullPath = dosyaYolu;
    } else {
      // Relatif path ise uploads klasörüyle birleştir
      fullPath = path.join(process.cwd(), 'uploads', dosyaYolu);
    }
    
    DebugUtils.log(`📁 [SIRKET_DOSYA] Dosya yolu: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      DebugUtils.log(`❌ [SIRKET_DOSYA] Dosya bulunamadı: ${fullPath}`);
      return reply.status(404).send({ success: false, message: 'Dosya sistemde bulunamadı' });
    }
    
    DebugUtils.log(`✅ [SIRKET_DOSYA] Dosya bulundu, gönderiliyor: ${fullPath}`);
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${dosyaAdi}"`);
    const stream = fs.createReadStream(fullPath);
    return reply.send(stream);
  } catch (error) {
    console.error('Şirket dosya indirme hatası:', error);
    return reply.status(500).send({ success: false, message: 'Sunucu hatası' });
  }
}
