import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { OnayDurumu } from '../generated/prisma/index.js';
import { 
  CreateBasvuruDTO, 
  
  BasvuruResponseDTO, 
  CancelBasvuruDTO,
  BasvuruListResponseDTO,
  BasvuruStatsDTO,
  StajTipiEnum
} from '../dtos/basvuru.dto.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/error.utils.js';
import { FileService } from '../utils/file.utils.js';
import { ValidationUtils } from '../utils/validation.utils.js';
import { generateAndSendOtp } from '../controllers/sirket.controller.js';
import LoggerService, { LogAction, LogLevel } from './logger.service.js';
import * as path from 'path';
import { promises as fs } from 'fs';

// Define interface for database basvuru object
interface DatabaseBasvuru {
  id: number;
  ogrenciId: number;
  kurumAdi: string;
  kurumAdresi: string;
  sorumluTelefon: string;
  sorumluMail: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  stajTipi: string;
  baslangicTarihi: Date;
  bitisTarihi: Date;
  gun: number;
  yurtDisi: string;
  stajAlaniBolumu: string;
  dosyaYolu?: string;
  transkriptDosyasi?: string;
  hizmetDokumu?: string;
  sigortaDosyasi?: string;
  onayDurumu: string;
  danismanAciklama?: string;
  kariyerMerkeziAciklama?: string;
  olusturmaTarihi: Date;
  guncellenmeTarihi: Date;
  [key: string]: unknown; // For additional fields
}

export class BasvuruService {
  
  async getAllBasvurularByUserId(userId: number): Promise<BasvuruListResponseDTO> {
    ValidationUtils.validateId(userId, 'Kullanıcı ID');
    
    const basvurular = await prisma.stajBasvurusu.findMany({
      where: { ogrenciId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        // include minimal student info so mapToResponseDTO can read ogrenci.department
        ogrenci: {
          select: { department: true }
        }
      }
    });

    return {
      basvurular: basvurular.map(this.mapToResponseDTO),
      toplam: basvurular.length
    };
  }

  async getMuafiyetBasvurularByUserId(userId: number): Promise<any> {
    ValidationUtils.validateId(userId, 'Kullanıcı ID');
    
    const muafiyetBasvurular = await prisma.muafiyetBasvurusu.findMany({
      where: { ogrenciId: userId },
      orderBy: { createdAt: 'desc' }
    });

    return muafiyetBasvurular.map(basvuru => ({
      id: basvuru.id,
      ogrenciId: basvuru.ogrenciId,
      sgk4a: basvuru.sgk4a,
      danismanMail: basvuru.danismanMail,
      onayDurumu: basvuru.onayDurumu,
      danismanOnayDurumu: basvuru.danismanOnayDurumu,
      danismanAciklama: basvuru.danismanAciklama,
      createdAt: basvuru.createdAt.toISOString(),
      updatedAt: basvuru.updatedAt.toISOString(),
      type: 'MUAFIYET', // For distinguishing from regular applications
      // CAP bilgileri
      isCapBasvuru: basvuru.isCapBasvuru,
      capFakulte: basvuru.capFakulte,
      capBolum: basvuru.capBolum,
      capDepartman: basvuru.capDepartman,
    }));
  }

  async getBasvuruById(basvuruId: number, userId: number): Promise<BasvuruResponseDTO> {
    ValidationUtils.validateId(basvuruId, 'Başvuru ID');
    ValidationUtils.validateId(userId, 'Kullanıcı ID');

    const basvuru = await prisma.stajBasvurusu.findFirst({
      where: { id: basvuruId, ogrenciId: userId },
      include: {
        ogrenci: {
          select: { department: true }
        }
      }
    });

    if (!basvuru) {
      throw new NotFoundError('Başvuru bulunamadı veya bu başvuruya erişim yetkiniz yok.');
    }

    return this.mapToResponseDTO(basvuru);
  }

  async createBasvuru(data: CreateBasvuruDTO, userId: number, files: { transkriptDosyasi: string; hizmetDokumu?: string | null; sigortaDosyasi?: string | null; }): Promise<BasvuruResponseDTO> {
    if (process.env.NODE_ENV === 'development') {
      process.stdout.write('📝 [BASVURU] Yeni başvuru oluşturuluyor...\n');
      process.stdout.write(`📝 [BASVURU] Kullanıcı ID: ${userId}\n`);
      process.stdout.write(`📝 [BASVURU] Şirket Email: ${data.sorumluMail}\n`);
      process.stdout.write(`📝 [BASVURU] Kurum Adı: ${data.kurumAdi}\n`);
      process.stdout.write(`📝 [BASVURU] CAP Başvuru: ${data.isCapBasvuru ? 'EVET' : 'HAYIR'}\n`);
      if (data.isCapBasvuru) {
        process.stdout.write(`📝 [BASVURU] CAP ID: ${data.capId}\n`);
        process.stdout.write(`📝 [BASVURU] CAP Fakülte: ${data.capFakulte}\n`);
        process.stdout.write(`📝 [BASVURU] CAP Bölüm: ${data.capBolum}\n`);
        process.stdout.write(`📝 [BASVURU] CAP Departman: ${data.capDepartman}\n`);
      }
    }
    
    ValidationUtils.validateId(userId, 'Kullanıcı ID');
    this.validateBasvuruData(data);
    // Enum doğrulaması
    if (!Object.values(StajTipiEnum).includes(data.stajTipi as StajTipiEnum)) {
      throw new BadRequestError('Geçersiz staj tipi.');
    }

    // CAP başvuru ise, CAP verilerini capUser tablosundan getir ve doğrula
    let finalCapFakulte = data.capFakulte;
    let finalCapBolum = data.capBolum;
    let finalCapDepartman = data.capDepartman;
    
    if (data.isCapBasvuru && data.capId && data.capId !== 1) {
      console.log(`🔍 [CAP] CAP verileri capUser tablosundan getiriliyor - CAP ID: ${data.capId}`);
      
      const capRecord = await prisma.capUser.findFirst({
        where: {
          id: data.capId,
          ogrenciId: userId
        }
      });

      if (capRecord) {
        finalCapFakulte = capRecord.capFakulte;
        finalCapBolum = capRecord.capBolum;
        finalCapDepartman = capRecord.capDepartman;
        console.log(`✅ [CAP] CAP verileri capUser'dan alındı - Fakülte: ${finalCapFakulte}, Bölüm: ${finalCapBolum}, Departman: ${finalCapDepartman}`);
      } else {
        throw new BadRequestError('CAP kaydı bulunamadı veya bu CAP kaydına erişim yetkiniz yok.');
      }
    }

    // Danışman emailini otomatik al
    const danismanMail = await this.getUserDanismanMail(
      userId, 
      data.isCapBasvuru, 
      finalCapFakulte ?? undefined,
      finalCapBolum ?? undefined,
      finalCapDepartman ?? undefined,
      data.capId
    );

    const basvuru = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const yeniBasvuru = await tx.stajBasvurusu.create({
        data: {
          kurumAdi: data.kurumAdi,
          kurumAdresi: data.kurumAdresi,
          sorumluTelefon: data.sorumluTelefon,
          sorumluMail: data.sorumluMail,
          yetkiliAdi: data.yetkiliAdi,
          yetkiliUnvani: data.yetkiliUnvani,
          stajTipi: data.stajTipi,
          baslangicTarihi: (() => {
            const date = new Date(data.baslangicTarihi);
            date.setHours(date.getHours() + 3); // GMT+3 için +3 saat ekle
            return date;
          })(),
          bitisTarihi: (() => {
            const date = new Date(data.bitisTarihi);
            date.setHours(date.getHours() + 3); // GMT+3 için +3 saat ekle
            return date;
          })(),
          seciliGunler: data.seciliGunler,
          toplamGun: data.toplamGun,
          saglikSigortasiDurumu: data.saglikSigortasiDurumu,
          danismanMail: danismanMail, // Otomatik dolduruldu
          ogrenciId: userId,
          transkriptDosyasi: files.transkriptDosyasi,
          onayDurumu: OnayDurumu.HOCA_ONAYI_BEKLIYOR,
          // Yeni alanlar
          yurtDisi: data.yurtDisi ?? null,
          turkFirmasi: data.turkFirmasi ?? null,
          sigortaDosyasi: files.sigortaDosyasi ?? null,
          hizmetDokumu: files.hizmetDokumu ?? null,
          // CAP bilgileri - capUser tablosundan gelen gerçek veriler
          isCapBasvuru: data.isCapBasvuru ?? false,
          capFakulte: finalCapFakulte ?? null,
          capBolum: finalCapBolum ?? null,
          capDepartman: finalCapDepartman ?? null,
        },
      });

      // Log kaydı MongoDB'ye ekle (BasvuruLog tablosu yerine)
      const logger = LoggerService.getInstance();
      await logger.log(null, {
        action: LogAction.OLUSTURULDU,
        level: LogLevel.INFO,
        userId: userId,
        details: {
          action: 'basvuru_olusturuldu',
          basvuruId: yeniBasvuru.id,
          kurumAdi: data.kurumAdi,
          isCapBasvuru: data.isCapBasvuru,
          capFakulte: finalCapFakulte,
          capBolum: finalCapBolum,
          capDepartman: finalCapDepartman,
          timestamp: new Date().toISOString()
        }
      });

      return yeniBasvuru;
    });

    if (process.env.NODE_ENV === 'development') {
      process.stdout.write(`✅ [BASVURU] Başvuru veritabanına kaydedildi. ID: ${basvuru.id}\n`);
      if (data.isCapBasvuru) {
        process.stdout.write(`✅ [CAP] CAP bilgileri kaydedildi - Fakülte: ${finalCapFakulte}, Bölüm: ${finalCapBolum}, Departman: ${finalCapDepartman}\n`);
      }
    }

    // Danışmana yeni başvuru bildirimi gönder
    try {
      // Öğrenci bilgilerini al
      const ogrenci = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      if (ogrenci) {
        const { sendDanismanYeniBasvuruBildirimi } = await import('../utils/mailer.js');
        await sendDanismanYeniBasvuruBildirimi(
          danismanMail,
          ogrenci.name ?? '',
          data.kurumAdi,
          basvuru.id,
          data.stajTipi as string
        );
        if (process.env.NODE_ENV === 'development') {
          process.stdout.write('✅ [BASVURU] Danışmana yeni başvuru bildirimi gönderildi\n');
        }
      }
    } catch (emailError) {
      if (process.env.NODE_ENV === 'development') {
        process.stderr.write(`❌ [BASVURU] Danışman bildirimi gönderileme hatası: ${emailError}\n`);
      }
      // Email hatası başvuru oluşturmayı engellemez
    }

    return this.mapToResponseDTO(basvuru);
  }
  
  async createMuafiyetBasvuru(
    userId: number, 
    sgk4aFilePath: string, 
    capData?: {
      isCapBasvuru: boolean;
      capFakulte?: string;
      capBolum?: string;
      capDepartman?: string;
      capId?: number;
    }
  ): Promise<any> {
    if (process.env.NODE_ENV === 'development') {
      process.stdout.write('📝 [MUAFIYET] Yeni muafiyet başvurusu oluşturuluyor...\n');
      process.stdout.write(`📝 [MUAFIYET] Kullanıcı ID: ${userId}\n`);
      process.stdout.write(`📝 [MUAFIYET] CAP Başvuru: ${capData?.isCapBasvuru ? 'EVET' : 'HAYIR'}\n`);
      if (capData?.isCapBasvuru) {
        process.stdout.write(`📝 [MUAFIYET] CAP Fakülte: ${capData.capFakulte}\n`);
        process.stdout.write(`📝 [MUAFIYET] CAP Bölüm: ${capData.capBolum}\n`);
        process.stdout.write(`📝 [MUAFIYET] CAP Departman: ${capData.capDepartman}\n`);
      }
    }
    
    ValidationUtils.validateId(userId, 'Kullanıcı ID');

    // Danışman emailini otomatik al (CAP veya normal)
    const danismanMail = await this.getUserDanismanMail(
      userId, 
      capData?.isCapBasvuru,
      capData?.capFakulte,
      capData?.capBolum,
      capData?.capDepartman,
      capData?.capId
    );

    if (process.env.NODE_ENV === 'development') {
      process.stdout.write(`📧 [MUAFIYET] Danışman Email: ${danismanMail}\n`);
    }

    const basvuru = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const yeniBasvuru = await tx.muafiyetBasvurusu.create({
        data: {
          ogrenciId: userId,
          sgk4a: sgk4aFilePath,
          danismanMail: danismanMail,
          onayDurumu: 'HOCA_ONAYI_BEKLIYOR',
          danismanOnayDurumu: 0,
          // CAP bilgileri
          isCapBasvuru: capData?.isCapBasvuru ?? false,
          capFakulte: capData?.capFakulte ?? null,
          capBolum: capData?.capBolum ?? null,
          capDepartman: capData?.capDepartman ?? null,
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
            }
          }
        }
      });

      if (process.env.NODE_ENV === 'development') {
        process.stdout.write(`✅ [MUAFIYET] Muafiyet başvurusu oluşturuldu ID: ${yeniBasvuru.id}\n`);
      }

      return yeniBasvuru;
    });

    // Danışmana yeni muafiyet başvuru bildirimi gönder
    try {
      // Öğrenci bilgilerini al
      const ogrenci = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      if (ogrenci) {
        const { sendDanismanYeniBasvuruBildirimi } = await import('../utils/mailer.js');
        await sendDanismanYeniBasvuruBildirimi(
          danismanMail,
          ogrenci.name ?? '',
          'MUAFİYET BAŞVURUSU',
          basvuru.id,
          'MUAFIYET'
        );
        if (process.env.NODE_ENV === 'development') {
          process.stdout.write('✅ [MUAFIYET] Danışmana yeni muafiyet başvuru bildirimi gönderildi\n');
        }
      }
    } catch (emailError) {
      if (process.env.NODE_ENV === 'development') {
        process.stderr.write(`❌ [MUAFIYET] Danışman bildirimi gönderileme hatası: ${emailError}\n`);
      }
      // Email hatası başvuru oluşturmayı engellemez
    }

    return {
      id: basvuru.id,
      ogrenciId: basvuru.ogrenciId,
      sgk4a: basvuru.sgk4a,
      danismanMail: basvuru.danismanMail,
      onayDurumu: basvuru.onayDurumu,
      danismanOnayDurumu: basvuru.danismanOnayDurumu,
      danismanAciklama: basvuru.danismanAciklama,
      createdAt: basvuru.createdAt.toISOString(),
      updatedAt: basvuru.updatedAt.toISOString(),
      ogrenci: basvuru.ogrenci
    };
  }

  // Student update flow removed entirely.

  async cancelBasvuru(basvuruId: number, userId: number, cancelData: CancelBasvuruDTO): Promise<BasvuruResponseDTO> {
    ValidationUtils.validateId(basvuruId, 'Başvuru ID');
    ValidationUtils.validateId(userId, 'Kullanıcı ID');
    ValidationUtils.validateRequired(cancelData.iptalSebebi, 'İptal sebebi');

    const basvuru = await this.getBasvuruByIdInternal(basvuruId, userId);

    if (basvuru.onayDurumu !== OnayDurumu.HOCA_ONAYI_BEKLIYOR) {
      throw new ForbiddenError('Sadece \'Danışman Onayı Bekliyor\' durumundaki başvurular iptal edilebilir.');
    }

    const cancelledBasvuru = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const guncellenmis = await tx.stajBasvurusu.update({
        where: { id: basvuruId },
        data: { 
          onayDurumu: OnayDurumu.IPTAL_EDILDI, 
          iptalSebebi: cancelData.iptalSebebi
        },
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
          iptalSebebi: cancelData.iptalSebebi,
          timestamp: new Date().toISOString()
        }
      });

      return guncellenmis;
    });

    return this.mapToResponseDTO(cancelledBasvuru);
  }
 async updateBasvuruTarih(basvuruId: number, userId: number, updateData: any): Promise<any> {
    ValidationUtils.validateId(basvuruId, 'Başvuru ID');
    ValidationUtils.validateId(userId, 'Kullanıcı ID');

    // Başvuruyu bul
    const basvuru = await this.getBasvuruByIdInternal(basvuruId, userId);

    // Sadece onaylanmış başvurular için tarih değişikliği yapılabilir
    if (basvuru.onayDurumu !== OnayDurumu.ONAYLANDI) {
      throw new ForbiddenError('Sadece onaylanmış başvuruların tarihleri değiştirilebilir.');
    }

    // Onay tarihini kontrol et (5 gün içinde olmalı)
    const onayTarihi = new Date(basvuru.updatedAt);
    const simdikiTarih = new Date();
    const besGunSonra = new Date(onayTarihi);
    besGunSonra.setDate(besGunSonra.getDate() + 5);

    if (simdikiTarih > besGunSonra) {
      throw new ForbiddenError('Tarih değişikliği sadece onay tarihinden itibaren 5 gün içinde yapılabilir.');
    }

    // Tarihleri GMT+3'e çevir
    const baslangicTarihi = new Date(updateData.baslangicTarihi);
    baslangicTarihi.setHours(baslangicTarihi.getHours() + 3);
    
    const bitisTarihi = new Date(updateData.bitisTarihi);
    bitisTarihi.setHours(bitisTarihi.getHours() + 3);

    // IMU 404 stajı için 70 iş günü zorunluluğu
    if (basvuru.stajTipi === 'IMU_404' && updateData.toplamGun !== 70) {
      throw new BadRequestError('IMU 404 stajı için toplam gün sayısı tam olarak 70 iş günü olmalıdır.');
    }

    // Başvuruyu güncelle
    const guncellenmisBasvuru = await prisma.stajBasvurusu.update({
      where: { id: basvuruId },
      data: {
        baslangicTarihi: baslangicTarihi,
        bitisTarihi: bitisTarihi,
        toplamGun: updateData.toplamGun,
        updatedAt: new Date()
      }
    });

    // Log kaydı ekle
    const logger = LoggerService.getInstance();
    await logger.log(null, {
      action: LogAction.BASVURU_UPDATE,
      level: LogLevel.INFO,
      userId: userId,
      details: {
        action: 'basvuru_tarih_guncellendi',
        basvuruId: basvuruId,
        eskiBaslangicTarihi: basvuru.baslangicTarihi,
        yeniBaslangicTarihi: baslangicTarihi,
        eskiBitisTarihi: basvuru.bitisTarihi,
        yeniBitisTarihi: bitisTarihi,
        eskiToplamGun: basvuru.toplamGun,
        yeniToplamGun: updateData.toplamGun,
        timestamp: new Date().toISOString()
      }
    });

    return this.mapToResponseDTO(guncellenmisBasvuru);
  }

  async getBasvuruStats(userId: number): Promise<BasvuruStatsDTO> {
    ValidationUtils.validateId(userId, 'Kullanıcı ID');

    const stats = await prisma.stajBasvurusu.groupBy({
      by: ['onayDurumu'],
      where: { ogrenciId: userId },
      _count: true,
    });

    const result: BasvuruStatsDTO = {
      beklemede: 0,
      onaylandi: 0,
      reddedildi: 0,
      iptalEdildi: 0,
      toplam: 0
    };

    stats.forEach((stat: { onayDurumu: string; _count: number }) => {
      switch (stat.onayDurumu) {
        case 'HocaOnayiBekliyor':
          result.beklemede = stat._count;
          break;
        case 'Onaylandi':
          result.onaylandi = stat._count;
          break;
        case 'Reddedildi':
          result.reddedildi = stat._count;
          break;
        case 'IptalEdildi':
          result.iptalEdildi = stat._count;
          break;
      }
      result.toplam += stat._count;
    });

    return result;
  }

  // Private helper methods

  private async getUserDanismanMail(
    userId: number, 
    isCapBasvuru?: boolean, 
    capFakulte?: string,
    capBolum?: string,
    capDepartman?: string,
    capId?: number
  ): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        danisman: {
          select: {
            email: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı.');
    }

    // CAP başvurusu ise, öğrencinin CAP kaydından danışman bilgisini al
    if (isCapBasvuru && capId && capId !== 1) {
      console.log(`🔍 [CAP] CAP başvurusu için danışman aranıyor - CAP ID: ${capId}`);
      
      const capRecord = await prisma.capUser.findFirst({
        where: {
          id: capId,
          ogrenciId: userId
        },
        include: {
          capDanisman: {
            select: {
              email: true,
              name: true
            }
          }
        }
      });

      if (capRecord?.capDanisman?.email) {
        console.log(`✅ [CAP] CAP danışmanı bulundu: ${capRecord.capDanisman.email}`);
        return capRecord.capDanisman.email;
      } else {
        console.log(`❌ [CAP] CAP danışmanı bulunamadı, ana danışman kullanılacak`);
        // CAP kaydında danışman yoksa ana danışmanı kullan
      }
    }

    // Normal başvuru veya CAP danışmanı bulunamadığında ana danışman kullan
    if (!user.danisman?.email) {
      throw new BadRequestError('Bu öğrencinin danışmanı sistemde tanımlı değil.');
    }

    console.log(`✅ [NORMAL] Normal danışman kullanılacak: ${user.danisman.email}`);
    return user.danisman.email;
  }

  private async getBasvuruByIdInternal(basvuruId: number, userId: number) {
    const basvuru = await prisma.stajBasvurusu.findFirst({
      where: { id: basvuruId, ogrenciId: userId },
      include: {
        ogrenci: {
          select: { department: true }
        }
      }
    });

    if (!basvuru) {
      throw new NotFoundError('Başvuru bulunamadı veya bu başvuruya erişim yetkiniz yok.');
    }

    return basvuru;
  }

  private mapToResponseDTO(basvuru: Record<string, unknown>): BasvuruResponseDTO {
    // Determine department: prefer CAP departman if present, otherwise use linked student's department field, then fall back to capDepartman/capBolum/capFakulte as available
    const capDepartman = basvuru.capDepartman as string | null | undefined;
    const ogrenciDepartment = (basvuru as any).ogrenci?.department as string | undefined;
    const departmentFromStudent = ogrenciDepartment ?? (basvuru as any).department ?? null;
    const departmentFinal = capDepartman ?? departmentFromStudent ?? null;

    return {
      id: basvuru.id as number,
      ogrenciId: basvuru.ogrenciId as number,
      kurumAdi: basvuru.kurumAdi as string,
      kurumAdresi: basvuru.kurumAdresi as string,
      sorumluTelefon: basvuru.sorumluTelefon as string,
      sorumluMail: basvuru.sorumluMail as string,
      yetkiliAdi: basvuru.yetkiliAdi as string,
      yetkiliUnvani: basvuru.yetkiliUnvani as string,
      stajTipi: basvuru.stajTipi as any, // Will be properly typed with enum later
      baslangicTarihi: (basvuru.baslangicTarihi as Date).toISOString(),
      bitisTarihi: (basvuru.bitisTarihi as Date).toISOString(),
      seciliGunler: basvuru.seciliGunler as string,
      toplamGun: basvuru.toplamGun as number,
      saglikSigortasiDurumu: basvuru.saglikSigortasiDurumu as string,
      danismanMail: basvuru.danismanMail as string,
      yurtDisi: basvuru.yurtDisi as string ?? null,
      turkFirmasi: basvuru.turkFirmasi as string ?? null,
      sigortaDosyasi: basvuru.sigortaDosyasi as string ?? null,
      hizmetDokumu: basvuru.hizmetDokumu as string ?? null,
      onayDurumu: basvuru.onayDurumu as string,
      transkriptDosyasi: basvuru.transkriptDosyasi as string | undefined,
      createdAt: (basvuru.createdAt as Date).toISOString(),
      updatedAt: (basvuru.updatedAt as Date).toISOString(),
      iptalSebebi: basvuru.iptalSebebi as string | undefined,
      // CAP bilgileri
      isCapBasvuru: basvuru.isCapBasvuru as boolean ?? false,
      capFakulte: basvuru.capFakulte as string ?? null,
      capBolum: basvuru.capBolum as string ?? null,
      capDepartman: basvuru.capDepartman as string ?? null,
      // New field: department (for UI convenience)
      department: departmentFinal,
    };
  }

  private validateBasvuruData(data: CreateBasvuruDTO): void {
    if (!Object.values(StajTipiEnum).includes(data.stajTipi as StajTipiEnum)) {
      throw new BadRequestError('Geçersiz staj tipi.');
    }
    ValidationUtils.validateRequired(data.kurumAdi, 'Kurum adı');
    ValidationUtils.validateRequired(data.kurumAdresi, 'Kurum adresi');
    ValidationUtils.validateRequired(data.sorumluTelefon, 'Sorumlu telefon');
    ValidationUtils.validateRequired(data.sorumluMail, 'Sorumlu e-posta');
    ValidationUtils.validateEmail(data.sorumluMail);
    ValidationUtils.validatePhoneNumber(data.sorumluTelefon);
    ValidationUtils.validateRequired(data.yetkiliAdi, 'Yetkili adı');
    ValidationUtils.validateRequired(data.yetkiliUnvani, 'Yetkili ünvanı');
    ValidationUtils.validateRequired(data.stajTipi, 'Staj tipi');
    // danismanMail artık zorunlu değil - otomatik doldurulacak
    
    // Tarihleri string formatına çevir
    const baslangicTarihiStr = data.baslangicTarihi instanceof Date 
      ? data.baslangicTarihi.toISOString() 
      : data.baslangicTarihi;
    const bitisTarihiStr = data.bitisTarihi instanceof Date 
      ? data.bitisTarihi.toISOString() 
      : data.bitisTarihi;
      
    ValidationUtils.validateDateRange(baslangicTarihiStr, bitisTarihiStr);
    ValidationUtils.validateRequired(data.seciliGunler, 'Seçili günler');
    ValidationUtils.validateRequired(data.saglikSigortasiDurumu, 'Sağlık sigortası durumu');

    if (data.toplamGun < 1) {
      throw new BadRequestError('Toplam gün sayısı en az 1 olmalıdır.');
    }

    // IMU 404 stajı için 70 iş günü zorunluluğu
    if (data.stajTipi === StajTipiEnum.IMU_404 && data.toplamGun !== 70) {
      throw new BadRequestError('IMU 404 stajı için toplam gün sayısı tam olarak 70 iş günü olmalıdır.');
    }
  }

  private trackChanges(oldBasvuru: Record<string, unknown>, newData: Record<string, unknown>): string[] {
    const changes: string[] = [];
    const fieldNames: { [key: string]: string } = {
      kurumAdi: 'Kurum Adı',
      kurumAdresi: 'Kurum Adresi',
      sorumluTelefon: 'Sorumlu Telefon',
      sorumluMail: 'Sorumlu E-posta',
      yetkiliAdi: 'Yetkili Adı',
      yetkiliUnvani: 'Yetkili Ünvanı',
      stajTipi: 'Staj Tipi',
      baslangicTarihi: 'Başlangıç Tarihi',
      bitisTarihi: 'Bitiş Tarihi',
      seciliGunler: 'Seçili Günler',
      toplamGun: 'Toplam Gün',
      saglikSigortasiDurumu: 'Sağlık Sigortası Durumu',
      danismanMail: 'Danışman E-posta',
      transkriptDosyasi: 'Transkript Dosyası',
      hizmetDokumu: 'Hizmet Dökümü',
      sigortaDosyasi: 'Sigorta Dosyası'
    };

    for (const [key, newValue] of Object.entries(newData)) {
      if (key in oldBasvuru && oldBasvuru[key] !== newValue) {
        const fieldName = fieldNames[key] || key;
        const oldValue = oldBasvuru[key];
        
        if (key === 'baslangicTarihi' || key === 'bitisTarihi') {
          const oldDate = new Date(oldValue as string | number | Date).toLocaleDateString('tr-TR');
          const newDate = new Date(newValue as string | number | Date).toLocaleDateString('tr-TR');
          changes.push(`${fieldName}: ${oldDate} → ${newDate}`);
        } else if (key === 'transkriptDosyasi' || key === 'hizmetDokumu' || key === 'sigortaDosyasi') {
          changes.push(`${fieldName}: Dosya değiştirildi`);
        } else {
          changes.push(`${fieldName}: ${oldValue} → ${newValue}`);
        }
      }
    }

    return changes;
  }

  async downloadMuafiyetPdf(muafiyetId: number, userId: number): Promise<{ buffer: Buffer; filename: string }> {
    ValidationUtils.validateId(muafiyetId, 'Muafiyet ID');
    ValidationUtils.validateId(userId, 'Kullanıcı ID');

    const muafiyet = await prisma.muafiyetBasvurusu.findUnique({
      where: { id: muafiyetId },
    });

    if (!muafiyet) {
      throw new NotFoundError('Muafiyet başvurusu bulunamadı.');
    }

    // Kullanıcının kendi muafiyet başvurusuna erişebileceğini kontrol et
    if (muafiyet.ogrenciId !== userId) {
      throw new ForbiddenError('Bu muafiyet belgesine erişim yetkiniz yok.');
    }

    if (!muafiyet.sgk4a) {
      throw new BadRequestError('Bu muafiyet başvurusuna ait dosya bulunamadı.');
    }

    // Dosya yolunu oluştur - eğer tam yol değilse uploads klasörüyle birleştir
    let filePath: string;
    if (path.isAbsolute(muafiyet.sgk4a)) {
      filePath = muafiyet.sgk4a;
    } else {
      filePath = path.resolve(process.cwd(), 'uploads', muafiyet.sgk4a);
    }

    if (process.env.NODE_ENV === 'development') {
      process.stdout.write(`📄 [MUAFIYET_DOWNLOAD] Başvuru ID: ${muafiyetId}\n`);
      process.stdout.write(`📄 [MUAFIYET_DOWNLOAD] Veritabanındaki yol: ${muafiyet.sgk4a}\n`);
      process.stdout.write(`📄 [MUAFIYET_DOWNLOAD] Hesaplanan dosya yolu: ${filePath}\n`);
    }
    
    try {
      const buffer = await fs.readFile(filePath);
      const filename = `sgk4a-${muafiyetId}.pdf`;
      
      return { buffer, filename };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        process.stderr.write(`❌ [MUAFIYET_DOWNLOAD] Dosya okunamadı: ${filePath}\n`);
        process.stderr.write(`❌ [MUAFIYET_DOWNLOAD] Hata: ${error}\n`);
      }
      throw new NotFoundError('Muafiyet belgesi dosyası bulunamadı veya okunamadı.');
    }
  }
}

// Export a singleton instance
export const basvuruService = new BasvuruService();
