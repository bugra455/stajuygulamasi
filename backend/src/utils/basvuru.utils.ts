import { prisma } from '../lib/prisma.js';
import { StajBasvurusu, OnayDurumu } from '../generated/prisma/index.js';
import { NotFoundError, ForbiddenError } from './error.utils.js';

export class BasvuruUtils {
  /**
   * Başvuru erişim kontrolü yapar
   * @param basvuruId - Başvuru ID
   * @param userId - Kullanıcı ID
   * @returns Başvuru verisi
   * @throws NotFoundError - Başvuru bulunamadığında
   */
  static async validateBasvuruAccess(basvuruId: number, userId: number): Promise<StajBasvurusu> {
    const basvuru = await prisma.stajBasvurusu.findFirst({
      where: { 
        id: basvuruId, 
        ogrenciId: userId 
      },
      include: {
        ogrenci: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!basvuru) {
      throw new NotFoundError('Başvuru bulunamadı veya bu başvuruya erişim yetkiniz yok.');
    }
    
    return basvuru;
  }

  /**
   * Başvurunun düzenlenebilir olup olmadığını kontrol eder
   * @param onayDurumu - Başvuru onay durumu
   * @returns Düzenlenebilir mi
   */
  static isBasvuruEditable(onayDurumu: OnayDurumu): boolean {
    return onayDurumu === OnayDurumu.HOCA_ONAYI_BEKLIYOR;
  }

  /**
   * Başvurunun iptal edilebilir olup olmadığını kontrol eder
   * @param onayDurumu - Başvuru onay durumu
   * @returns İptal edilebilir mi
   */
  static isBasvuruCancellable(onayDurumu: OnayDurumu): boolean {
    return onayDurumu === OnayDurumu.HOCA_ONAYI_BEKLIYOR;
  }

  /**
   * Stajın aktif olup olmadığını kontrol eder
   * @param baslangic - Staj başlangıç tarihi
   * @param bitis - Staj bitiş tarihi
   * @returns Staj aktif mi
   */
  static isStajActive(baslangic: Date, bitis: Date): boolean {
    const now = new Date();
    return now >= baslangic && now <= bitis;
  }

  /**
   * Stajın henüz başlamamış olup olmadığını kontrol eder
   * @param baslangic - Staj başlangıç tarihi
   * @returns Staj henüz başlamamış mı
   */
  static isStajNotStarted(baslangic: Date): boolean {
    const now = new Date();
    return now < baslangic;
  }

  /**
   * Stajın bitmiş olup olmadığını kontrol eder
   * @param bitis - Staj bitiş tarihi
   * @returns Staj bitmiş mi
   */
  static isStajFinished(bitis: Date): boolean {
    const now = new Date();
    return now > bitis;
  }

  /**
   * Başvuru durumunu güncelleme yetkisi kontrolü
   * @param currentUserId - Mevcut kullanıcı ID
   * @param basvuru - Başvuru verisi
   * @param newStatus - Yeni durum
   * @throws ForbiddenError - Yetki yoksa
   */
  static validateStatusUpdatePermission(
    currentUserId: number, 
    basvuru: StajBasvurusu, 
    newStatus: OnayDurumu
  ): void {
    // Öğrenci sadece iptal edebilir
    if (basvuru.ogrenciId === currentUserId && newStatus !== OnayDurumu.IPTAL_EDILDI) {
      throw new ForbiddenError('Bu durum değişikliğini yapma yetkiniz yok.');
    }
  }

  /**
   * Günlük yazma erişimi kontrolü
   * @param basvuru - Başvuru verisi
   * @throws ForbiddenError - Erişim yoksa
   */
  static validateDailyEntryAccess(basvuru: StajBasvurusu): void {
    if (basvuru.onayDurumu !== OnayDurumu.ONAYLANDI) {
      throw new ForbiddenError('Sadece onaylanmış başvurular için günlük yazabilirsiniz.');
    }

    if (this.isStajNotStarted(basvuru.baslangicTarihi)) {
      throw new ForbiddenError('Staj henüz başlamadığı için günlük yazamazsınız.');
    }
  }

  /**
   * Tarih aralığının staj dönemi içinde olup olmadığını kontrol eder
   * @param tarih - Kontrol edilecek tarih
   * @param baslangic - Staj başlangıç tarihi
   * @param bitis - Staj bitiş tarihi
   * @returns Aralıkta mı
   */
  static isDateInStajPeriod(tarih: Date, baslangic: Date, bitis: Date): boolean {
    return tarih >= baslangic && tarih <= bitis;
  }
}
