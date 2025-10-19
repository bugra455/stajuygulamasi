import { env } from 'node:process';
import nodemailer from 'nodemailer';
import LoggerService, { LogAction, LogLevel } from '../services/logger.service.js';

// SMTP transporter yapılandırması
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: process.env.SMTP_SECURE === 'true',
  // MailHog için auth gereksiz, eğer credentials varsa ekle
  ...(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER.trim() !== '' && process.env.SMTP_PASS.trim() !== ''
    ? { 
        auth: { 
          user: process.env.SMTP_USER, 
          pass: process.env.SMTP_PASS 
        } 
      }
    : {}),
});

// Mail gönderme fonksiyonu with comprehensive logging
export async function sendMail(to: string, subject: string, html: string) {
  const logger = LoggerService.getInstance();
  
  try {
    await logger.log(null, {
      action: LogAction.EMAIL_SENT,
      level: LogLevel.INFO,
      details: {
        action: 'email_send_initiated',
        recipient: to,
        subject,
        timestamp: new Date().toISOString()
      }
    });
    
    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@stajkontrol.com',
      to,
      subject,
      html,
    });
    
    await logger.log(null, {
      action: LogAction.EMAIL_SENT,
      level: LogLevel.INFO,
      details: {
        action: 'email_send_success',
        recipient: to,
        subject,
        messageId: result.messageId,
        response: result.response
      }
    });
    
    return result;
  } catch (error) {
    await logger.log(null, {
      action: LogAction.API_ERROR,
      level: LogLevel.ERROR,
      details: {
        action: 'email_send_failed',
        recipient: to,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      }
    });

    throw error;
  }
}

// OTP ile şirket maili gönderme with logging
export async function sendCompanyOtpMail(
  companyEmail: string,
  otp: string,
  basvuruId: number,
  kurumAdi: string,
  ogrenciAdi: string
) {
  const logger = LoggerService.getInstance();
  
  await logger.log(null, {
    action: LogAction.EMAIL_SENT,
    level: LogLevel.INFO,
    details: {
      action: 'company_otp_email_initiated',
      companyEmail,
      basvuruId,
      kurumAdi,
      ogrenciAdi,
      otpLength: otp.length
    }
  });

  const subject = `Staj Başvurusu Onay Kodu - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; text-align: center;">Staj Başvurusu Onay Kodu</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Sayın ${kurumAdi} Yetkilisi,</strong></p>
        <p>${ogrenciAdi} adlı öğrenci şirketinizde staj yapmak için başvuru yaptı.</p>
        <p>Bu başvuruyu görüntülemek ve onaylamak için aşağıdaki tek kullanımlık kodu kullanabilirsiniz:</p>
        <div style="background-color: #007bff; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; margin: 20px 0; border-radius: 5px; letter-spacing: 3px;">
          ${otp}
        </div>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p>Bu kod 30 gün süreyle geçerlidir.</p>
        <a href="${process.env.FRONTEND_URL}/sirketgiris" 
           style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Başvuruyu Görüntüle
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj başvuru sistemi tarafından otomatik olarak gönderilmiştir.</p>
        <p>Eğer bu başvuru ile ilgili değilseniz, lütfen bu e-postayı dikkate almayın.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(companyEmail, subject, html);
    await logger.log(null, {
      action: LogAction.EMAIL_SENT,
      level: LogLevel.INFO,
      details: {
        action: 'company_otp_email_success',
        companyEmail,
        basvuruId,
        kurumAdi,
        messageId: result.messageId
      }
    });
    return result;
  } catch (error) {
    await logger.log(null, {
      action: LogAction.API_ERROR,
      level: LogLevel.ERROR,
      details: {
        action: 'company_otp_email_failed',
        companyEmail,
        basvuruId,
        kurumAdi,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

// Test mail fonksiyonu
export async function testMailConnection() {
  const logger = LoggerService.getInstance();
  
  await logger.log(null, {
    action: LogAction.SYSTEM_STARTUP,
    level: LogLevel.INFO,
    details: {
      action: 'smtp_connection_test_initiated',
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT
    }
  });
  
  try {
    await transporter.verify();
    await logger.log(null, {
      action: LogAction.SYSTEM_STARTUP,
      level: LogLevel.INFO,
      details: {
        action: 'smtp_connection_test_success',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT
      }
    });
    return true;
  } catch (error) {
    await logger.log(null, {
      action: LogAction.API_ERROR,
      level: LogLevel.ERROR,
      details: {
        action: 'smtp_connection_test_failed',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    return false;
  }
}

// Danışman onayından sonra öğrenciye bilgilendirme maili
export async function sendDanismanOnayBildirimMail(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number
) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('👨‍🏫 [DANISMAN_ONAY] Danışman onay bildirimi gönderiliyor');
    console.log('👨‍🏫 [DANISMAN_ONAY] Öğrenci Email:', ogrenciEmail);
  }

  const subject = `Staj Başvurunuz Danışman Tarafından Onaylandı - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; text-align: center;">✅ Başvurunuz Danışman Tarafından Onaylandı</h2>
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj başvurunuz danışmanınız tarafından onaylanmıştır.</p>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p><strong>Sıradaki Adım:</strong> Başvurunuz şimdi Kariyer Merkezi onayına gönderilmiştir.</p>
        <p>Başvurunuzun durumunu takip etmek için sisteme giriş yapabilirsiniz.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvurularim" 
           style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Başvurularımı Görüntüle
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [DANISMAN_ONAY] Danışman onay bildirimi başarıyla gönderildi!');
    }
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [DANISMAN_ONAY] Danışman onay bildirimi gönderme hatası!');
    throw error;
  }
}

export async function sendDanismanOnayBildirimKariyerMail(
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number
) {
  console.log('👨‍🏫 [DANISMAN_KARIYER_ONAY] Danışman onay bildirimi gönderiliyor');
  console.log('👨‍🏫 [DANISMAN_KARIYER_ONAY] KM Email:', process.env.KARIYER_MERKEZI);

  const subject = `Bekleyen bir staj basvurunuz var - ${basvuruId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; text-align: center;">✅ Başvurunuz Danışman Tarafından Onaylandı</h2>
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <p><strong>Sayın Kariyer Merkezi yetkilisi,</strong></p>
        <p><strong><Öğrencimiz ${ogrenciAdi}'nın ${kurumAdi}</strong> şirketine yaptığı staj başvurusu onayınızda beklemektedir.</p>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p>Başvuruyu görüntülemek ve onaylamak için aşağıdaki butona tıklayabilirsiniz:</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/danisman-panel" 
           style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Danışman Paneline Git
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail((process.env.KARIYER_MERKEZI)!, subject, html);
    console.log('✅ [DANISMAN_KARIYER_ONAY] Danışman onay bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [DANISMAN_KARIYER_ONAY] Danışman onay bildirimi gönderme hatası!');
    throw error;
  }
}

// Kariyer Merkezi onayından sonra öğrenciye bilgilendirme maili
export async function sendKariyerMerkeziOnayBildirimMail(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number
) {
  console.log('🏢 [KARIYER_ONAY] Kariyer Merkezi onay bildirimi gönderiliyor');
  console.log('🏢 [KARIYER_ONAY] Öğrenci Email:', ogrenciEmail);

  const subject = `Staj Başvurunuz Kariyer Merkezi Tarafından Onaylandı - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; text-align: center;">✅ Başvurunuz Kariyer Merkezi Tarafından Onaylandı</h2>
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj başvurunuz Kariyer Merkezi tarafından onaylanmıştır.</p>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p><strong>Sıradaki Adım:</strong> Başvurunuz şimdi şirket onayına gönderilmiştir. Şirkete onay kodu e-postası gönderilmiştir.</p>
        <p>Başvurunuzun durumunu takip etmek için sisteme giriş yapabilirsiniz.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvurularim" 
           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Başvurularımı Görüntüle
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    console.log('✅ [KARIYER_ONAY] Kariyer Merkezi onay bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [KARIYER_ONAY] Kariyer Merkezi onay bildirimi gönderme hatası!');
    throw error;
  }
}

// Şirket onayından sonra öğrenciye bilgilendirme maili
export async function sendSirketOnayBildirimMail(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number,
  baslangicTarihi: Date,
  bitisTarihi: Date
) {
  console.log('🏭 [SIRKET_ONAY] Şirket onay bildirimi gönderiliyor');
  console.log('🏭 [SIRKET_ONAY] Öğrenci Email:', ogrenciEmail);

  const subject = `🎉 Staj Başvurunuz Onaylandı! - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; text-align: center;">🎉 Tebrikler! Staj Başvurunuz Onaylandı</h2>
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj başvurunuz tamamen onaylanmıştır! 🎊</p>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p><strong>Staj Başlangıç Tarihi:</strong> ${baslangicTarihi.toLocaleDateString('tr-TR')}</p>
        <p><strong>Staj Bitiş Tarihi:</strong> ${bitisTarihi.toLocaleDateString('tr-TR')}</p>
        <p><strong>Sıradaki Adım:</strong> Staj defteriniz oluşturulmuştur. Stajınız tamamlandıktan sonra defter yüklemeniz gerekmektedir.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvurularim" 
           style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Başvurularımı Görüntüle
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    console.log('✅ [SIRKET_ONAY] Şirket onay bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [SIRKET_ONAY] Şirket onay bildirimi gönderme hatası!');
    throw error;
  }
}

// Red işlemi sonrası öğrenciye bilgilendirme maili
export async function sendRedBildirimMail(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number,
  redSebebi: string,
  redEdenKisi: string
) {
  console.log('❌ [RED_BILDIRIMI] Red bildirimi gönderiliyor');
  console.log('❌ [RED_BILDIRIMI] Öğrenci Email:', ogrenciEmail);

  const subject = `Staj Başvurunuz Hakkında Bilgilendirme - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc3545; text-align: center;">Staj Başvurunuz Hakkında Bilgilendirme</h2>
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj başvurunuz maalesef reddedilmiştir.</p>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p><strong>Red Eden:</strong> ${redEdenKisi}</p>
        <p><strong>Red Sebebi:</strong> ${redSebebi}</p>
        <p>Gerekli düzenlemeleri yaparak yeni bir başvuru oluşturabilirsiniz.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvuru-olustur" 
           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Yeni Başvuru Oluştur
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    console.log('✅ [RED_BILDIRIMI] Red bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [RED_BILDIRIMI] Red bildirimi gönderme hatası!');
    throw error;
  }
}

// Şirket defter onayı için OTP maili gönderme
export async function sendDefterSirketOtpMail(
  companyEmail: string,
  otp: string,
  defterId: number,
  kurumAdi: string,
  ogrenciAdi: string
) {
  console.log('📧 [DEFTER_SIRKET_OTP] Şirket defter OTP maili gönderimi başlatıldı');
  console.log('📧 [DEFTER_SIRKET_OTP] Hedef Email:', companyEmail);
  console.log('📧 [DEFTER_SIRKET_OTP] OTP:', otp);
  console.log('📧 [DEFTER_SIRKET_OTP] Defter ID:', defterId);

  const subject = `Staj Defteri Onayı - ${kurumAdi}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Staj Defteri Onay Talebi</h1>
        </div>
        
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px;">📋 Defter Onay Bilgileri</h2>
          <p style="margin: 8px 0; color: #374151;"><strong>Öğrenci:</strong> ${ogrenciAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Kurum:</strong> ${kurumAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Defter ID:</strong> #${defterId}</p>
        </div>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
          <h3 style="color: #92400e; margin: 0 0 15px 0;">🔐 Onay Kodu (OTP)</h3>
          <div style="background-color: #fbbf24; color: white; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
            ${otp}
          </div>
          <p style="color: #92400e; margin: 15px 0 0 0; font-size: 14px;">Bu kod 30 gün geçerlidir</p>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #374151; margin: 0 0 15px 0;">ℹ️ Defter Onay Süreci</h3>
          <p style="color: #6b7280; margin: 0; line-height: 1.6;">
            Öğrenci staj defterini sisteme yüklemiştir. Defterin içeriğini inceleyip onaylamanız veya reddetmeniz beklenmektedir. 
            Onayınızdan sonra defter danışman onayına iletilecektir.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${process.env.FRONTEND_URL}/sirketgiris" 
             style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Giriş Yap
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Bu mail otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
            Staj Kontrol Sistemi - ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(companyEmail, subject, html);
    console.log('✅ [DEFTER_SIRKET_OTP] Şirket defter OTP maili başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [DEFTER_SIRKET_OTP] Şirket defter OTP maili gönderme hatası!');
    throw error;
  }
}

// Öğrenci başvuru oluşturduğunda danışmana bilgilendirme maili
export async function sendDanismanYeniBasvuruBildirimi(
  danismanEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number,
  stajTipi: string
) {
  console.log('📧 [DANISMAN_YENI_BASVURU] Danışmana yeni başvuru bildirimi gönderiliyor');
  console.log('📧 [DANISMAN_YENI_BASVURU] Danışman Email:', danismanEmail);
  console.log('📧 [DANISMAN_YENI_BASVURU] Öğrenci:', ogrenciAdi);
  console.log('📧 [DANISMAN_YENI_BASVURU] Başvuru ID:', basvuruId);

  const subject = `Yeni Staj Başvurusu - ${ogrenciAdi} - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin: 0; font-size: 28px;">📝 Yeni Staj Başvurusu</h1>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #0c5460; margin: 0 0 15px 0; font-size: 20px;">👨‍🎓 Başvuru Bilgileri</h2>
          <p style="margin: 8px 0; color: #374151;"><strong>Öğrenci:</strong> ${ogrenciAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Kurum:</strong> ${kurumAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Staj Tipi:</strong> ${stajTipi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Başvuru ID:</strong> #${basvuruId}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #856404; margin: 0 0 15px 0;">⏳ Onayınız Bekleniyor</h3>
          <p style="color: #856404; margin: 0; line-height: 1.6;">
            Öğrenciniz yeni bir staj başvurusu oluşturmuştur. Başvuruyu inceleyerek onaylamanız veya 
            gerekli düzeltmeler için reddetmeniz beklenmektedir.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/danisman/basvurular" 
             style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            📋 Başvuruları İncele
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Bu mail otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
            Staj Kontrol Sistemi - ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(danismanEmail, subject, html);
    console.log('✅ [DANISMAN_YENI_BASVURU] Danışman bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [DANISMAN_YENI_BASVURU] Danışman bildirimi gönderme hatası!');
    throw error;
  }
}

// Danışman başvuruyu reddettiğinde öğrenciye bilgilendirme maili
export async function sendDanismanRedBildirimi(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number,
  redSebebi: string
) {
  console.log('📧 [DANISMAN_RED] Danışman red bildirimi gönderiliyor');
  console.log('📧 [DANISMAN_RED] Öğrenci Email:', ogrenciEmail);
  console.log('📧 [DANISMAN_RED] Başvuru ID:', basvuruId);

  const subject = `Staj Başvurunuz Hakkında - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc3545; text-align: center;">Staj Başvurunuz Hakkında Bilgilendirme</h2>
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj başvurunuz danışmanınız tarafından reddedilmiştir.</p>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p><strong>Red Sebebi:</strong> ${redSebebi}</p>
        <p>Gerekli düzenlemeleri yaparak başvurunuzu güncelleyebilir veya yeni bir başvuru oluşturabilirsiniz.</p>
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvurularim" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
            Başvurularım
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvuru-olustur" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Yeni Başvuru
          </a>
        </div>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    console.log('✅ [DANISMAN_RED] Danışman red bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [DANISMAN_RED] Danışman red bildirimi gönderme hatası!');
    throw error;
  }
}

// Kariyer merkezi başvuruyu reddettiğinde öğrenciye bilgilendirme maili
export async function sendKariyerMerkeziRedBildirimi(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number,
  redSebebi: string
) {
  console.log('📧 [KARIYER_RED] Kariyer merkezi red bildirimi gönderiliyor');
  console.log('📧 [KARIYER_RED] Öğrenci Email:', ogrenciEmail);
  console.log('📧 [KARIYER_RED] Başvuru ID:', basvuruId);

  const subject = `Staj Başvurunuz Hakkında - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc3545; text-align: center;">Staj Başvurunuz Hakkında Bilgilendirme</h2>
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj başvurunuz Kariyer Merkezi tarafından reddedilmiştir.</p>
        <p><strong>Başvuru ID:</strong> ${basvuruId}</p>
        <p><strong>Red Sebebi:</strong> ${redSebebi}</p>
        <p>Gerekli düzenlemeleri yaparak başvurunuzu güncelleyebilir veya yeni bir başvuru oluşturabilirsiniz.</p>
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvurularim" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
            Başvurularım
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/basvuru-olustur" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Yeni Başvuru
          </a>
        </div>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    console.log('✅ [KARIYER_RED] Kariyer merkezi red bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [KARIYER_RED] Kariyer merkezi red bildirimi gönderme hatası!');
    throw error;
  }
}

// Şirket onayladıktan sonra kariyer merkezine bilgilendirme maili
export async function sendSirketOnayBildirimKariyerMail(
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number
) {
  console.log('🏭 [SIRKET_ONAY_KARIYER] Şirket onayı sonrası kariyer merkezine bilgilendirme gönderiliyor');
  console.log('🏭 [SIRKET_ONAY_KARIYER] Başvuru ID:', basvuruId);

  const subject = `Staj Başvurusu Şirket Tarafından Onaylandı - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin: 0; font-size: 28px;">✅ Staj Başvurusu Şirket Tarafından Onaylandı</h1>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #0c5460; margin: 0 0 15px 0; font-size: 20px;">📋 Başvuru Bilgileri</h2>
          <p style="margin: 8px 0; color: #374151;"><strong>Öğrenci:</strong> ${ogrenciAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Kurum:</strong> ${kurumAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Başvuru ID:</strong> #${basvuruId}</p>
        </div>

        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 Başvuru Tamamlandı</h3>
          <p style="color: #155724; margin: 0; line-height: 1.6;">
            Staj başvurusu tüm onay aşamalarından başarıyla geçmiştir. Öğrencinin stajı başlamıştır.
          </p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Bu mail otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
            Staj Kontrol Sistemi - ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(process.env.KARIYER_MERKEZI_EMAIL || 'kariyer@example.com', subject, html);
    console.log('✅ [SIRKET_ONAY_KARIYER] Şirket onayı sonrası kariyer merkezi bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [SIRKET_ONAY_KARIYER] Şirket onayı sonrası kariyer merkezi bildirimi gönderme hatası!');
    throw error;
  }
}

// Şirket reddettikten sonra kariyer merkezine bilgilendirme maili
export async function sendSirketRedBildirimKariyerMail(
  ogrenciAdi: string,
  kurumAdi: string,
  basvuruId: number,
  redSebebi: string
) {
  console.log('🏭 [SIRKET_RED_KARIYER] Şirket red sonrası kariyer merkezine bilgilendirme gönderiliyor');
  console.log('🏭 [SIRKET_RED_KARIYER] Başvuru ID:', basvuruId);

  const subject = `Staj Başvurusu Şirket Tarafından Reddedildi - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin: 0; font-size: 28px;">❌ Staj Başvurusu Şirket Tarafından Reddedildi</h1>
        </div>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #721c24; margin: 0 0 15px 0; font-size: 20px;">📋 Başvuru Bilgileri</h2>
          <p style="margin: 8px 0; color: #374151;"><strong>Öğrenci:</strong> ${ogrenciAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Kurum:</strong> ${kurumAdi}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Başvuru ID:</strong> #${basvuruId}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Red Sebebi:</strong> ${redSebebi}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #856404; margin: 0 0 15px 0;">ℹ️ Bilgilendirme</h3>
          <p style="color: #856404; margin: 0; line-height: 1.6;">
            Staj başvurusu şirket tarafından reddedilmiştir. Öğrenci bilgilendirilmiştir.
          </p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Bu mail otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
            Staj Kontrol Sistemi - ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(process.env.KARIYER_MERKEZI_EMAIL || 'kariyer@example.com', subject, html);
    console.log('✅ [SIRKET_RED_KARIYER] Şirket red sonrası kariyer merkezi bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [SIRKET_RED_KARIYER] Şirket red sonrası kariyer merkezi bildirimi gönderme hatası!');
    throw error;
  }
}

// Defter onaylandıktan sonra öğrenciye bilgilendirme maili
export async function sendDefterOnayBildirimMail(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  defterId: number
) {
  console.log('📋 [DEFTER_ONAY] Defter onay bildirimi gönderiliyor');
  console.log('📋 [DEFTER_ONAY] Öğrenci Email:', ogrenciEmail);

  const subject = `Staj Defteriniz Onaylandı - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50; text-align: center;">🎉 Staj Defteriniz Onaylandı</h2>
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj defteriniz onaylanmıştır.</p>
        <p><strong>Defter ID:</strong> ${defterId}</p>
        <p><strong>Durum:</strong> Tebrikler! Staj süreciniz başarıyla tamamlanmıştır.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/defterim" 
           style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Defterimi Görüntüle
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    console.log('✅ [DEFTER_ONAY] Defter onay bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [DEFTER_ONAY] Defter onay bildirimi gönderme hatası!');
    throw error;
  }
}

// Defter reddedildikten sonra öğrenciye bilgilendirme maili
export async function sendDefterRedBildirimMail(
  ogrenciEmail: string,
  ogrenciAdi: string,
  kurumAdi: string,
  defterId: number,
  redSebebi: string
) {
  console.log('📋 [DEFTER_RED] Defter red bildirimi gönderiliyor');
  console.log('📋 [DEFTER_RED] Öğrenci Email:', ogrenciEmail);

  const subject = `Staj Defteriniz Hakkında - ${kurumAdi}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc3545; text-align: center;">Staj Defteriniz Hakkında Bilgilendirme</h2>
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
        <p><strong>Sayın ${ogrenciAdi},</strong></p>
        <p><strong>${kurumAdi}</strong> şirketine yaptığınız staj defteriniz reddedilmiştir.</p>
        <p><strong>Defter ID:</strong> ${defterId}</p>
        <p><strong>Red Sebebi:</strong> ${redSebebi}</p>
        <p>Gerekli düzenlemeleri yaparak defterinizi yeniden yükleyebilirsiniz.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ogrenci/defterim" 
           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Defterimi Güncelle
        </a>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Bu e-posta staj kontrol sistemi tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  `;
  
  try {
    const result = await sendMail(ogrenciEmail, subject, html);
    console.log('✅ [DEFTER_RED] Defter red bildirimi başarıyla gönderildi!');
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('❌ [DEFTER_RED] Defter red bildirimi gönderme hatası!');
    throw error;
  }
}
