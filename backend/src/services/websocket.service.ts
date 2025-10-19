// import { WebSocket } from 'ws';

interface NotificationPayload {
  type: 'excel_upload_complete' | 'excel_upload_failed' | 'progress_update' | 'upload_cancelled';
  dosyaId: number;
  message: string;
  data?: {
    totalRows?: number;
    successfulRows?: number;
    errorRows?: number;
    errors?: string[];
    percentage?: number;
    stage?: string;
  };
  timestamp: string;
}

class WebSocketNotificationService {
  private static instance: WebSocketNotificationService;
  private connectedClients: Set<any> = new Set();
  private currentUpload: { dosyaId: number; aborted: boolean } | null = null;

  public static getInstance(): WebSocketNotificationService {
    if (!WebSocketNotificationService.instance) {
      WebSocketNotificationService.instance = new WebSocketNotificationService();
    }
    return WebSocketNotificationService.instance;
  }

  // Reset upload tracking (called on server restart)
  public resetUploadTracking(): void {
    this.currentUpload = null;
    console.log('🔄 [WS] Upload tracking reset - server restart detected');
  }

  // Add a new WebSocket connection
  public addClient(ws: any): void {
    this.connectedClients.add(ws);
    console.log(`📡 [WS] New client connected. Total clients: ${this.connectedClients.size}`);

    // Remove client when connection closes
    ws.on('close', () => {
      this.connectedClients.delete(ws);
      console.log(`📡 [WS] Client disconnected. Total clients: ${this.connectedClients.size}`);
    });

    ws.on('error', (error: Error) => {
      console.error('📡 [WS] Client error:', error);
      this.connectedClients.delete(ws);
    });
  }

  // Send notification to a specific client
  private sendToClient(ws: any, payload: NotificationPayload): void {
    if (ws.readyState === 1) { // 1 = OPEN state
      try {
        ws.send(JSON.stringify(payload));
      } catch (error) {
        console.error('📡 [WS] Failed to send message to client:', error);
        this.connectedClients.delete(ws);
      }
    }
  }

  // Broadcast notification to all connected clients
  public broadcast(payload: NotificationPayload): void {
    console.log(`📡 [WS] Broadcasting to ${this.connectedClients.size} clients:`, payload.type, payload.message);
    
    // Remove closed connections and send to active ones
    const clientsToRemove: any[] = [];
    
    this.connectedClients.forEach((ws) => {
      if (ws.readyState === 1) { // 1 = OPEN state
        this.sendToClient(ws, payload);
      } else {
        clientsToRemove.push(ws);
      }
    });

    // Clean up closed connections
    clientsToRemove.forEach(ws => this.connectedClients.delete(ws));
  }

  // Send Excel upload completion notification
  public notifyExcelComplete(dosyaId: number, success: boolean, data?: any): void {
    const payload: NotificationPayload = {
      type: success ? 'excel_upload_complete' : 'excel_upload_failed',
      dosyaId,
      message: success 
        ? `Excel dosyası başarıyla işlendi! ${data?.successfulRows || 0} kayıt başarılı.`
        : `Excel dosyası işlenirken hata oluştu.`,
      data: success ? {
        totalRows: data?.totalRows || 0,
        successfulRows: data?.successfulRows || 0,
        errorRows: data?.errorRows || 0,
        errors: data?.errors || []
      } : undefined,
      timestamp: new Date().toISOString()
    };

    this.broadcast(payload);
  }

  // Send progress update with percentage
  public notifyProgressUpdate(dosyaId: number, percentage: number, stage: string): void {
    const payload: NotificationPayload = {
      type: 'progress_update',
      dosyaId,
      message: `${stage === 'processing' ? '⚙️ İşleniyor' : '📁 Yükleniyor'}: %${percentage}`,
      data: {
        percentage,
        stage
      },
      timestamp: new Date().toISOString()
    };

    this.broadcast(payload);
  }

  // Send progress update
  public notifyProgress(dosyaId: number, message: string, data?: any): void {
    const payload: NotificationPayload = {
      type: 'progress_update',
      dosyaId,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    this.broadcast(payload);
  }

  // Send upload cancelled notification
  public notifyUploadCancelled(dosyaId: number, message: string): void {
    const payload: NotificationPayload = {
      type: 'upload_cancelled',
      dosyaId,
      message,
      timestamp: new Date().toISOString()
    };

    this.broadcast(payload);
  }

  // Get connected clients count
  public getClientCount(): number {
    return this.connectedClients.size;
  }

  // Start upload tracking
  public startUpload(dosyaId: number): boolean {
    console.log(`🚀 [WS Service] Start upload called for dosyaId: ${dosyaId}`);
    if (this.currentUpload && !this.currentUpload.aborted) {
      console.log(`🚀 [WS Service] Another upload is in progress: ${this.currentUpload.dosyaId}`);
      return false; // Another upload is in progress
    }
    this.currentUpload = { dosyaId, aborted: false };
    console.log(`🚀 [WS Service] Upload tracking started for dosyaId: ${dosyaId}`);
    return true;
  }

  // Check if upload is aborted - check DB status as well
  public async isUploadAborted(dosyaId: number): Promise<boolean> {
    // First check memory state
    const memoryAborted = this.currentUpload?.dosyaId === dosyaId && this.currentUpload.aborted;
    if (memoryAborted) {
      console.log(`🚫 [WS Service] Upload ${dosyaId} aborted in memory`);
      return true;
    }
    
    // Also check DB status to handle server restarts and external cancellations
    try {
      const prismaModule = await import('../generated/prisma/index.js');
      const prisma = new prismaModule.PrismaClient();
      const dosya = await prisma.yuklenenDosya.findUnique({
        where: { id: dosyaId },
        select: { durumu: true }
      });
      await prisma.$disconnect();
      
      if (dosya?.durumu === 'IPTAL') {
        console.log(`🚫 [WS Service] Upload ${dosyaId} cancelled in DB`);
        return true;
      }
    } catch (err) {
      console.error('❌ [WS] Failed to check upload status in DB:', err);
    }
    
    return false;
  }

  // Cancel current upload
  public async cancelUpload(dosyaId: number): Promise<void> {
    console.log(`🚫 [WS Service] Cancel upload called for dosyaId: ${dosyaId}`);
    console.log(`🚫 [WS Service] Current upload:`, this.currentUpload);
    
    // ALWAYS mark as aborted - even if not currently tracked
    if (this.currentUpload?.dosyaId === dosyaId) {
      console.log(`🚫 [WS Service] Cancelling tracked upload ${dosyaId}`);
      this.currentUpload.aborted = true;
      
      // Immediately clear from memory to stop new processing
      this.currentUpload = null;
      console.log(`🧹 [WS Service] Cleared current upload from memory`);
    }

    // Cancel any BullMQ jobs for this dosyaId
    try {
      const BullMQ = await import('bullmq');
      const connection = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
      };
      
      const queue = new BullMQ.Queue('excelQueue', { connection });
      
      // Get all waiting/active jobs and cancel those with matching dosyaId
      const waitingJobs = await queue.getWaiting();
      const activeJobs = await queue.getActive();
      
      let cancelledCount = 0;
      
      for (const job of [...waitingJobs, ...activeJobs]) {
        if (job.data && job.data.dosyaId === dosyaId) {
          console.log(`🗑️ [WS Service] Cancelling BullMQ job ${job.id} for dosyaId: ${dosyaId}`);
          await job.remove();
          cancelledCount++;
        }
      }
      
      console.log(`🧹 [WS Service] Cancelled ${cancelledCount} BullMQ jobs for dosyaId: ${dosyaId}`);
      await queue.close();
      
    } catch (err) {
      console.error('❌ [WS] Failed to cancel BullMQ jobs:', err);
    }
    
    const payload: NotificationPayload = {
      type: 'upload_cancelled',
      dosyaId,
      message: 'Dosya yükleme iptal edildi',
      timestamp: new Date().toISOString()
    };
    
    this.broadcast(payload);

    // Update DB record to IPTAL (best-effort, non-blocking)
    try {
      const prismaModule = await import('../generated/prisma/index.js');
      const prisma = new prismaModule.PrismaClient();
      await prisma.yuklenenDosya.update({
        where: { id: dosyaId },
        data: { durumu: 'IPTAL', tamamlanmaTarih: new Date(), hataMesaji: 'Kullanıcı tarafından iptal edildi'}
      });
      await prisma.$disconnect();
      console.log(`📝 [WS Service] Updated DB record ${dosyaId} to IPTAL status`);
    } catch (err) {
      console.error('❌ [WS] Failed to mark upload as IPTAL in DB:', err);
    }
  }

  // Finish upload tracking
  public finishUpload(dosyaId: number): void {
    if (this.currentUpload?.dosyaId === dosyaId) {
      this.currentUpload = null;
    }
  }

  // Check if can start new upload
  public canStartUpload(): boolean {
    return !this.currentUpload || this.currentUpload.aborted;
  }
}

export default WebSocketNotificationService;
export { WebSocketNotificationService };
