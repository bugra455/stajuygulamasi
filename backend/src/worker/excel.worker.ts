import * as BullMQ from 'bullmq';
import { ExcelService } from '../services/excel.service.js';
import WebSocketNotificationService from '../services/websocket.service.js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
};

const queueName = 'excelQueue';

const queue = new BullMQ.Queue(queueName, { connection });

console.log('[WORKER] Excel worker starting, connecting to Redis at', connection);

const worker = new BullMQ.Worker(queueName, async (job: any) => {
  console.log(`[WORKER] Processing job ${job.id} name: "${job.name}" type: ${job.data.jobType}`);
  const { filePath, fileName, dosyaId, jobType } = job.data;

  if (!filePath || !fileName) {
    throw new Error('Invalid job payload: missing filePath or fileName');
  }

  const wsService = WebSocketNotificationService.getInstance();
  
  try {
    // Notify start
    wsService.notifyProgress(dosyaId, `Excel dosyası işleniyor: ${fileName}`);
    
    // Check if upload was already cancelled before processing starts
    if (await wsService.isUploadAborted(dosyaId)) {
      console.log(`[WORKER] Upload ${dosyaId} was already cancelled before processing`);
      wsService.notifyExcelComplete(dosyaId, false, { errorMessage: 'Upload was cancelled' });
      return { ok: false, cancelled: true };
    }
    
    let result;
    
    // Process based on job name or job type
    if (job.name === 'process-cap-ogrenci-excel' || jobType === 'cap-ogrenci') {
      console.log(`[WORKER] Processing CAP öğrenci Excel: ${fileName}`);
      result = await ExcelService.processCapOgrenciExcel(filePath, fileName, dosyaId);
    } else if (job.name === 'process-hoca-excel' || jobType === 'hoca') {
      console.log(`[WORKER] Processing hoca Excel: ${fileName}`);
      result = await ExcelService.processHocaExcel(filePath, fileName, dosyaId);
    } else {
      // Default to regular student processing
      console.log(`[WORKER] Processing regular öğrenci Excel: ${fileName}`);
      result = await ExcelService.processOgrenciExcel(filePath, fileName, dosyaId);
    }
    
    // Check if upload was cancelled during processing
    if (await wsService.isUploadAborted(dosyaId)) {
      console.log(`[WORKER] Upload ${dosyaId} was cancelled during processing`);
      wsService.notifyExcelComplete(dosyaId, false, { errorMessage: 'Upload was cancelled during processing' });
      return { ok: false, cancelled: true };
    }
    
    // Notify completion
    wsService.notifyExcelComplete(dosyaId, result.success, result);
    
    return { ok: true, result };
  } catch (error: any) {
    // Notify failure
    wsService.notifyExcelComplete(dosyaId, false, { errorMessage: error.message });
    throw error;
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job?.id} failed:`, err?.message || err);
});

// Export queue so controllers can add jobs programmatically if needed
export { queue };
