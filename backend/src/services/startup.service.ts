import { PrismaClient } from '../generated/prisma/index.js';
import LoggerService from './logger.service.js';

const prisma = new PrismaClient();
const logger = LoggerService.getInstance();

export class StartupService {
  /**
   * Sunucu yeniden başladığında tüm aktif yüklemeleri iptal et
   * Bu sayede kullanıcılar tamamlanmayacak işlemler için beklemezler
   */
  static async cleanupActiveUploads() {
    try {
      console.log('🧹 [STARTUP] Aktif yüklemeler temizleniyor...');
      
      // Tüm KUYRUKTA ve ISLENIYOR durumundaki dosyaları bul
      const activeUploads = await prisma.yuklenenDosya.findMany({
        where: {
          durumu: {
            in: ['KUYRUKTA', 'ISLENIYOR']
          }
        }
      });
      
      if (activeUploads.length === 0) {
        console.log('✅ [STARTUP] Temizlenecek aktif yükleme bulunamadı');
        return;
      }
      
      console.log(`🔄 [STARTUP] ${activeUploads.length} aktif yükleme bulundu, iptal ediliyor...`);
      
      // Tüm aktif yüklemeleri IPTAL durumuna çevir
      const updateResult = await prisma.yuklenenDosya.updateMany({
        where: {
          durumu: {
            in: ['KUYRUKTA', 'ISLENIYOR']
          }
        },
        data: {
          durumu: 'IPTAL',
          hataMesaji: 'Sunucu yeniden başlatıldığı için işlem iptal edildi',
          tamamlanmaTarih: new Date()
        }
      });
      
      console.log(`✅ [STARTUP] ${updateResult.count} aktif yükleme iptal edildi`);
      
      // Log kaydı
      await logger.log(null, {
        level: 'INFO' as any,
        action: 'STARTUP_CLEANUP' as any,
        details: { 
          message: `Sunucu başlatıldı - ${updateResult.count} aktif yükleme iptal edildi`,
          cancelledUploads: activeUploads.map(u => ({
            id: u.id,
            fileName: u.dosyaAdi,
            type: u.dosyaTipi,
            status: u.durumu
          }))
        }
      });
      
    } catch (error: any) {
      console.error('❌ [STARTUP] Aktif yüklemeler temizlenirken hata oluştu:', error.message);
      
      await logger.log(null, {
        level: 'ERROR' as any,
        action: 'STARTUP_CLEANUP_ERROR' as any,
        details: { 
          message: `Startup cleanup hatası: ${error.message}`,
          error: error.stack
        }
      });
    }
  }
  
  /**
   * Sunucu başlatma işlemlerini gerçekleştir
   */
  static async initialize() {
    try {
      console.log('🚀 [STARTUP] Sunucu başlatılıyor...');
      
      // Aktif yüklemeleri temizle
      await this.cleanupActiveUploads();
      
      // Worker queue'ları temizle (eğer varsa)
      await this.clearWorkerQueues();
      
      // WebSocket upload tracking'i reset et
      await this.resetWebSocketTracking();
      
      console.log('✅ [STARTUP] Sunucu başarıyla başlatıldı');
      
    } catch (error: any) {
      console.error('❌ [STARTUP] Sunucu başlatma hatası:', error.message);
      throw error;
    }
  }
  
  /**
   * Worker queue'larını temizle
   */
  private static async clearWorkerQueues() {
    try {
      // Bull queue'yu import et ve temizle
      const { queue } = await import('../worker/excel.worker.js');
      
      // Bekleyen tüm job'ları temizle
      await queue.clean(0, 'waiting' as any);
      await queue.clean(0, 'active' as any);
      await queue.clean(0, 'delayed' as any);
      
      console.log('🧹 [STARTUP] Worker queuelari temizlendi');
      
    } catch (error: any) {
      console.warn('⚠️ [STARTUP] Worker queue temizleme hatası (normal olabilir):', error.message);
    }
  }
  
  /**
   * WebSocket upload tracking'i reset et
   */
  private static async resetWebSocketTracking() {
    try {
      const { WebSocketNotificationService } = await import('./websocket.service.js');
      const wsService = WebSocketNotificationService.getInstance();
      wsService.resetUploadTracking();
      
      console.log('🔄 [STARTUP] WebSocket upload tracking reset edildi');
      
    } catch (error: any) {
      console.warn('⚠️ [STARTUP] WebSocket tracking reset hatası (normal olabilir):', error.message);
    }
  }
  
  /**
   * Sunucu kapanırken temizlik işlemleri
   */
  static async cleanup() {
    try {
      console.log('🛑 [SHUTDOWN] Sunucu kapatılıyor...');
      
      // Prisma bağlantısını kapat
      await prisma.$disconnect();
      
      console.log('✅ [SHUTDOWN] Temizlik tamamlandı');
      
    } catch (error: any) {
      console.error('❌ [SHUTDOWN] Temizlik hatası:', error.message);
    }
  }
}
