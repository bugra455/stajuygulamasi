import * as cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { sendMail } from '../utils/mailer.js';
import LoggerService from './logger.service.js';

interface ReminderData {
  basvuruId: number;
  ogrenciAdi: string;
  ogrenciSoyadi: string;
  ogrenciMail: string;
  kurumAdi: string;
  sorumluMail: string;
  stajTipi: string;
  onayDurumu: string;
  updatedAt: Date;
  beklemeSuresi: number; // gün cinsinden
}

export class CronService {
  private static instance: CronService;
  private logger = LoggerService.getInstance();

  private constructor() {}

  public static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

  public startAllJobs(): void {
    this.startReminderJob();
    console.log('CRON_STARTED: Tüm cron job\'ları başlatıldı');
  }

  public stopAllJobs(): void {
    cron.getTasks().forEach((task) => {
      task.stop();
    });
    console.log('CRON_STOPPED: Tüm cron job\'ları durduruldu');
  }

  private startReminderJob(): void {
    // Her sabah saat 10:00'da çalışacak
    cron.schedule('0 10 * * *', async () => {
      try {
        console.log('CRON_REMINDER_START: Hatırlatma kontrolü başlatıldı');
        await this.checkAndSendReminders();
        console.log('CRON_REMINDER_END: Hatırlatma kontrolü tamamlandı');
      } catch (error) {
        console.error('CRON_REMINDER_ERROR: Hatırlatma kontrolü sırasında hata:', error);
      }
    }, {
      timezone: 'Europe/Istanbul'
    });

    console.log('CRON_REMINDER_SCHEDULED: Hatırlatma job\'ı planlandı: Her sabah 10:00');
  }

  // Public method for manual testing
  public async checkAndSendReminders(): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    // 3 gündür bekleyen başvuruları bul
    const pendingApplications = await prisma.stajBasvurusu.findMany({
      where: {
        updatedAt: {
          lte: threeDaysAgo
        },
        onayDurumu: {
          in: ['HOCA_ONAYI_BEKLIYOR', 'SIRKET_ONAYI_BEKLIYOR', 'KARIYER_MERKEZI_ONAYI_BEKLIYOR']
        }
      },
      include: {
        ogrenci: true
      }
    });

    console.log(`CRON_PENDING_FOUND: ${pendingApplications.length} adet 3 gündür bekleyen başvuru bulundu`);

    for (const basvuru of pendingApplications) {
      const reminderData: ReminderData = {
        basvuruId: basvuru.id,
        ogrenciAdi: basvuru.ogrenci.name || 'Bilinmeyen',
        ogrenciSoyadi: '', // Schema'da soyad ayrı yok, name'de birlikte
        ogrenciMail: basvuru.ogrenci.email || '',
        kurumAdi: basvuru.kurumAdi,
        sorumluMail: basvuru.sorumluMail,
        stajTipi: basvuru.stajTipi,
        onayDurumu: basvuru.onayDurumu,
        updatedAt: basvuru.updatedAt,
        beklemeSuresi: Math.floor((new Date().getTime() - basvuru.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      };

      await this.sendReminderBasedOnStatus(reminderData);
    }

    // Staj başlangıcına 5 gün kala otomatik iptal kontrolü
    await this.checkAndCancelExpiredApplications();
  }

  private async sendReminderBasedOnStatus(data: ReminderData): Promise<void> {
    try {
      switch (data.onayDurumu) {
        case 'HOCA_ONAYI_BEKLIYOR':
          await this.sendTeacherReminder(data);
          break;
        
        case 'SIRKET_ONAYI_BEKLIYOR':
          await this.sendCompanyReminder(data);
          break;
        
        case 'KARIYER_MERKEZI_ONAYI_BEKLIYOR':
          await this.sendCareerCenterReminder(data);
          break;
      }

      // Hatırlatma gönderildikten sonra bir log kaydı oluştur
      await this.createReminderLog(data);
      
    } catch (error) {
      console.error(`REMINDER_SEND_ERROR: Hatırlatma gönderimi hatası - Başvuru ID: ${data.basvuruId}`, error);
    }
  }

  private async sendTeacherReminder(data: ReminderData): Promise<void> {
    // Danışman mailini bul - danismanMail field'dan
    const basvuru = await prisma.stajBasvurusu.findUnique({
      where: { id: data.basvuruId }
    });

    if (!basvuru?.danismanMail) {
      console.warn(`TEACHER_NOT_FOUND: Danışman bulunamadı - Başvuru ID: ${data.basvuruId}`);
      return;
    }

    const subject = `Hatırlatma: ${data.ogrenciAdi} - Staj Başvuru Onayı Bekliyor`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Staj Başvuru Onay Hatırlatması</h2>
        
        <p>Sayın Öğretim Üyesi,</p>
        
        <p><strong>${data.ogrenciAdi}</strong> öğrencisinin staj başvurusu <strong>${data.beklemeSuresi} gündür</strong> onayınızı beklemektedir.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #374151;">Başvuru Detayları:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Öğrenci:</strong> ${data.ogrenciAdi}</li>
            <li><strong>Kurum:</strong> ${data.kurumAdi}</li>
            <li><strong>Staj Türü:</strong> ${data.stajTipi}</li>
            <li><strong>Bekleme Süresi:</strong> ${data.beklemeSuresi} gün</li>
          </ul>
        </div>
        
        <p>Lütfen sisteme giriş yaparak başvuruyu inceleyin ve onaylayın.</p>
        
        <p>Saygılarımızla,<br>Staj Kontrol Sistemi</p>
      </div>
    `;

    await sendMail(basvuru.danismanMail, subject, htmlContent);
    console.log(`TEACHER_REMINDER_SENT: Danışman hatırlatması gönderildi - ${basvuru.danismanMail} - Başvuru ID: ${data.basvuruId}`);
  }

  private async sendCompanyReminder(data: ReminderData): Promise<void> {
    // Şirkete ve kariyer merkezine hatırlatma gönder
    const subject = `Hatırlatma: ${data.ogrenciAdi} - Staj Başvuru Onayı Bekliyor`;
    
    const companyHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Staj Başvuru Onay Hatırlatması</h2>
        
        <p>Sayın ${data.kurumAdi} Yetkilileri,</p>
        
        <p><strong>${data.ogrenciAdi}</strong> öğrencisinin staj başvurusu <strong>${data.beklemeSuresi} gündür</strong> onayınızı beklemektedir.</p>
        
        <div style="background-color: #fef2f2; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #7f1d1d;">Başvuru Detayları:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Öğrenci:</strong> ${data.ogrenciAdi}</li>
            <li><strong>Öğrenci Mail:</strong> ${data.ogrenciMail}</li>
            <li><strong>Staj Türü:</strong> ${data.stajTipi}</li>
            <li><strong>Bekleme Süresi:</strong> ${data.beklemeSuresi} gün</li>
          </ul>
        </div>
        
        <p>Lütfen en kısa sürede başvuruyu değerlendirin ve sisteme cevabınızı bildirin.</p>
        
        <p>Saygılarımızla,<br>Staj Kontrol Sistemi</p>
      </div>
    `;

    // Şirkete gönder
    await sendMail(data.sorumluMail, subject, companyHtmlContent);
    console.log(`COMPANY_REMINDER_SENT: Şirket hatırlatması gönderildi - ${data.sorumluMail} - Başvuru ID: ${data.basvuruId}`);

    // Kariyer merkezine bilgi gönder
    const careerCenterSubject = `Bilgi: Şirket 3 Gündür Onay Bekletiyor - ${data.ogrenciAdi}`;
    const careerCenterHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Şirket Onay Gecikmesi Bildirimi</h2>
        
        <p>Kariyer Merkezi,</p>
        
        <p><strong>${data.kurumAdi}</strong> kurumu, <strong>${data.ogrenciAdi}</strong> öğrencisinin staj başvurusunu <strong>${data.beklemeSuresi} gündür</strong> onaylamıyor.</p>
        
        <div style="background-color: #fffbeb; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Başvuru Detayları:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Öğrenci:</strong> ${data.ogrenciAdi}</li>
            <li><strong>Kurum:</strong> ${data.kurumAdi}</li>
            <li><strong>Sorumlu Mail:</strong> ${data.sorumluMail}</li>
            <li><strong>Staj Türü:</strong> ${data.stajTipi}</li>
            <li><strong>Bekleme Süresi:</strong> ${data.beklemeSuresi} gün</li>
          </ul>
        </div>
        
        <p>Kuruma hatırlatma maili gönderilmiştir. Gerekirse takip edebilirsiniz.</p>
        
        <p>Sistem Bildirimi</p>
      </div>
    `;

    // Kariyer merkezi mail adresini environment'tan al (varsayılan olarak)
    const careerCenterEmail = process.env.CAREER_CENTER_EMAIL || 'kariyer@uni.edu.tr';
    await sendMail(careerCenterEmail, careerCenterSubject, careerCenterHtmlContent);
    console.log(`CAREER_CENTER_NOTIFICATION_SENT: Kariyer merkezi bildirimi gönderildi - Başvuru ID: ${data.basvuruId}`);
  }

  private async sendCareerCenterReminder(data: ReminderData): Promise<void> {
    const subject = `Hatırlatma: ${data.ogrenciAdi} - Kariyer Merkezi Onayı Bekliyor`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Kariyer Merkezi Onay Hatırlatması</h2>
        
        <p>Kariyer Merkezi,</p>
        
        <p><strong>${data.ogrenciAdi}</strong> öğrencisinin staj başvurusu <strong>${data.beklemeSuresi} gündür</strong> onayınızı beklemektedir.</p>
        
        <div style="background-color: #ecfdf5; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #059669;">
          <h3 style="margin-top: 0; color: #065f46;">Başvuru Detayları:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Öğrenci:</strong> ${data.ogrenciAdi}</li>
            <li><strong>Kurum:</strong> ${data.kurumAdi}</li>
            <li><strong>Staj Türü:</strong> ${data.stajTipi}</li>
            <li><strong>Bekleme Süresi:</strong> ${data.beklemeSuresi} gün</li>
          </ul>
        </div>
        
        <p>Lütfen sisteme giriş yaparak başvuruyu inceleyin ve onaylayın.</p>
        
        <p>Sistem Hatırlatması</p>
      </div>
    `;

    const careerCenterEmail = process.env.CAREER_CENTER_EMAIL || 'kariyer@uni.edu.tr';
    await sendMail(careerCenterEmail, subject, htmlContent);
    console.log(`CAREER_CENTER_REMINDER_SENT: Kariyer merkezi hatırlatması gönderildi - Başvuru ID: ${data.basvuruId}`);
  }

  private async createReminderLog(data: ReminderData): Promise<void> {
    try {
      // Hatırlatma logunu veritabanına kaydet (opsiyonel)
      // Bu tabloyu daha sonra oluşturabiliriz
      console.log(`REMINDER_LOG_CREATED: Hatırlatma log kaydı oluşturuldu - Başvuru ID: ${data.basvuruId}, Durum: ${data.onayDurumu}`);
    } catch (error) {
      console.error('REMINDER_LOG_ERROR: Hatırlatma log kaydı oluşturulamadı', error);
    }
  }

  private async checkAndCancelExpiredApplications(): Promise<void> {
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    fiveDaysFromNow.setHours(23, 59, 59, 999); // Günün sonuna kadar

    try {
      // Staj başlangıcına 5 gün veya daha az kalan, henüz onaylanmamış başvuruları bul
      const expiringSoonApplications = await prisma.stajBasvurusu.findMany({
        where: {
          baslangicTarihi: {
            lte: fiveDaysFromNow
          },
          onayDurumu: {
            in: ['HOCA_ONAYI_BEKLIYOR', 'SIRKET_ONAYI_BEKLIYOR', 'KARIYER_MERKEZI_ONAYI_BEKLIYOR']
          }
        },
        include: {
          ogrenci: true
        }
      });

      console.log(`AUTO_CANCEL_CHECK: ${expiringSoonApplications.length} adet süresi dolan başvuru bulundu`);

      for (const basvuru of expiringSoonApplications) {
        try {
          // Başvuruyu otomatik iptal et
          await prisma.stajBasvurusu.update({
            where: { id: basvuru.id },
            data: {
              onayDurumu: 'IPTAL_EDILDI',
              iptalSebebi: 'Süreçler staj başlangıcının 5 gün öncesine kadar tamamlanmalıdır. Sistem tarafından otomatik iptal edilmiştir.'
            }
          });

          // Öğrenciye bilgilendirme maili gönder
          await this.sendCancellationNotification(basvuru);
          
          console.log(`AUTO_CANCEL_SUCCESS: Başvuru otomatik iptal edildi - ID: ${basvuru.id}, Öğrenci: ${basvuru.ogrenci.name}`);
          
        } catch (error) {
          console.error(`AUTO_CANCEL_ERROR: Başvuru iptal edilemedi - ID: ${basvuru.id}`, error);
        }
      }

    } catch (error) {
      console.error('AUTO_CANCEL_SYSTEM_ERROR: Otomatik iptal sistemi hatası:', error);
    }
  }

  private async sendCancellationNotification(basvuru: any): Promise<void> {
    try {
      const subject = `Staj Başvurunuz İptal Edildi - ${basvuru.kurumAdi}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Staj Başvuru İptal Bildirimi</h2>
          
          <p>Sayın ${basvuru.ogrenci.name},</p>
          
          <p>Aşağıdaki staj başvurunuz sistem tarafından otomatik olarak iptal edilmiştir:</p>
          
          <div style="background-color: #fef2f2; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #7f1d1d;">İptal Edilen Başvuru:</h3>
            <ul style="list-style: none; padding-left: 0;">
              <li><strong>Kurum:</strong> ${basvuru.kurumAdi}</li>
              <li><strong>Staj Türü:</strong> ${basvuru.stajTipi}</li>
              <li><strong>Başlangıç Tarihi:</strong> ${new Date(basvuru.baslangicTarihi).toLocaleDateString('tr-TR')}</li>
              <li><strong>İptal Sebebi:</strong> Süreçler staj başlangıcının 5 gün öncesine kadar tamamlanmalıdır</li>
            </ul>
          </div>
          
          <div style="background-color: #fffbeb; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">Önemli Bilgi:</h3>
            <p>Staj başvurunuz onay sürecinin zamanında tamamlanamaması nedeniyle sistem tarafından otomatik olarak iptal edilmiştir. 
            Yeni bir başvuru yapmak için lütfen staj başlangıç tarihinden en az 10 gün öncesinden başvurunuzu tamamlayın.</p>
          </div>
          
          <p>Herhangi bir sorunuz için Kariyer Merkezi ile iletişime geçebilirsiniz.</p>
          
          <p>Saygılarımızla,<br>Staj Kontrol Sistemi</p>
        </div>
      `;

      if (basvuru.ogrenci.email) {
        await sendMail(basvuru.ogrenci.email, subject, htmlContent);
        console.log(`CANCELLATION_EMAIL_SENT: İptal bildirimi gönderildi - ${basvuru.ogrenci.email} - Başvuru ID: ${basvuru.id}`);
      }
    } catch (error) {
      console.error(`CANCELLATION_EMAIL_ERROR: İptal bildirimi gönderilemedi - Başvuru ID: ${basvuru.id}`, error);
    }
  }
}

export const cronService = CronService.getInstance();