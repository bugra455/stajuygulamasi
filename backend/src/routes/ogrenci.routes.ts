import { FastifyInstance } from 'fastify';
import { requireAnyRole } from '../lib/auth.js';
import { UserType } from '../generated/prisma/index.js';
import * as defterController from '../controllers/defter.controller.js';
import * as basvuruController from '../controllers/basvuru.controller.js';

export async function ogrenciRoutes(app: FastifyInstance) {
  // Middleware: Sadece öğrenciler erişebilir
  app.addHook('preHandler', requireAnyRole([UserType.OGRENCI]));

  // BAŞVURU OPERATIONS - Sadece öğrenci işlemleri
  app.get('/basvurular', basvuruController.getBasvurular as never);
  app.get('/basvuru/:id', basvuruController.getBasvuruById as never);
  app.post('/basvuru', basvuruController.createBasvuru as never);
  app.post('/basvuru/:id/iptal', basvuruController.cancelBasvuru as never);

  // MUAFİYET BAŞVURU OPERATIONS - Ayrı endpoint
  app.post('/muafiyet-basvuru', basvuruController.createMuafiyetBasvuru as never);
  app.get('/muafiyet-basvurular', basvuruController.getMuafiyetBasvurular as never);
  app.get('/muafiyet-basvuru/:id/download-pdf', basvuruController.downloadMuafiyetPdf as never);

  // DEFTER OPERATIONS - Sadece öğrenci işlemleri
  app.get('/defterler', defterController.getDefterler as any);
  app.get('/defter/:id', defterController.getDefterById as any);
  
  // PDF UPLOAD/DOWNLOAD OPERATIONS - Sadece öğrenci
  app.post('/defter/:basvuruId/upload-pdf', defterController.uploadDefterPdf as any);
  app.get('/defter/:id/download-pdf', defterController.downloadDefterPdf as any);
  app.delete('/defter/:id/pdf', defterController.deleteDefterPdf as any);
  app.put('/defter/:id/durum', defterController.updateDefterDurumu as any);
}
