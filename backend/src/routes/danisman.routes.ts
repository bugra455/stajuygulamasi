import { FastifyInstance } from 'fastify';
import { requireAnyRole } from '../lib/auth.js';
import { UserType } from '../generated/prisma/index.js';
import * as danismanController from '../controllers/danisman.controller.js';
import * as basvuruController from '../controllers/basvuru.controller.js';
import * as defterController from '../controllers/defter.controller.js';
import * as fileController from '../controllers/file.controller.js';

export async function danismanRoutes(app: FastifyInstance) {
  // Middleware: Sadece danışmanlar erişebilir
  app.addHook('preHandler', requireAnyRole([UserType.DANISMAN]));

  // ÖĞRENCI YÖNETİMİ
  app.get('/ogrenciler', danismanController.getOgrenciler as any);
  app.get('/ogrenciler/search', danismanController.searchOgrenciler as any);
  app.get('/bolumler', danismanController.getBolumler as any);

  // BAŞVURU YÖNETİMİ - basvuru.controller'dan taşınan route'lar
  app.get('/ogrenciler-basvuru', basvuruController.getDanismanOgrencileri as never); // Eski: /basvuru/danisman/ogrenciler
  app.get('/basvurular-liste', basvuruController.getDanismanBasvurular as never); // Eski: /basvuru/danisman/basvurular
  app.get('/basvuru/:id', basvuruController.getDanismanBasvuruDetay as never); // Eski: /basvuru/danisman/:id
  app.post('/basvuru/:id/onayla', basvuruController.onaylaBasvuru as never); // Eski: /basvuru/:id/onayla
  app.post('/basvuru/:id/reddet', basvuruController.reddetBasvuru as never); // Eski: /basvuru/:id/reddet
  
  // Mevcut danışman route'ları
  app.get('/basvurular', danismanController.getBasvurular as any);
  app.get('/basvurular/search', danismanController.searchBasvurular as any);
  app.get('/basvurular/:id', danismanController.getBasvuru as any);
  app.get('/ogrenci/:ogrenciId/basvurular', danismanController.getOgrenciTumBasvurulari as any); // Öğrencinin tüm başvuruları
  app.get('/ogrenci/:ogrenciId/basvurular-modal', danismanController.getOgrenciTumBasvurulariModal as any); // Modal için tüm başvurular
  app.get('/ogrenci/:ogrenciId/detay', danismanController.getOgrenciDetay as any); // Danışman için öğrenci detay
  app.post('/basvurular/:id/onayla', danismanController.onaylaBasvuru as any);
  app.post('/basvurular/:id/reddet', danismanController.reddetBasvuru as any);
  app.get('/basvurular/:id/download-transcript', danismanController.downloadBasvuruTranscript as any);
  app.get('/basvurular/:id/download-sigorta', danismanController.downloadSigortaDosyasi as any);
  app.get('/basvurular/:id/download-hizmet', fileController.downloadHizmetDokumu as any);

  // DEFTER YÖNETİMİ - basvuru.controller'dan taşınan route'lar
  app.get('/defterler-liste', basvuruController.getDanismanDefterler as never); // Eski: /basvuru/danisman/defterler
  app.get('/defter/:id/detay', basvuruController.getDanismanDefterDetay as never); // Eski: /basvuru/danisman/defter/:id
  app.put('/defter/:id/durum-guncelle', basvuruController.updateDefterDurumu as never); // Eski: /basvuru/danisman/defter/:id/durum
  
  // DEFTER YÖNETİMİ - defterController'dan taşınan route'lar
  app.get('/defterler-goruntule/:id', defterController.getDefterById as any); // Eski: /defter/:id
  app.put('/defterler-durum/:id', defterController.updateDefterDurumu as any); // Eski: /defter/:id/durum
  app.get('/defterler-pdf/:id/download', defterController.downloadDefterPdf as any); // Eski: /defter/:id/download-pdf
  
  // Mevcut defter route'ları
  app.get('/defterler', danismanController.getDefterler as any);
  app.get('/defterler/search', danismanController.searchDefterler as any);
  app.get('/defterler/:id', danismanController.getDefter as any);
  app.put('/defterler/:id/durum', danismanController.updateDefterDurumu as any);
  app.post('/defterler/:id/onayla', danismanController.onaylaDefteri as any);
  app.get('/defterler/:id/download-pdf', danismanController.downloadDefterPdf as any);

  // MUAFIYET BAŞVURU YÖNETİMİ
  app.get('/muafiyet-basvurular', danismanController.getMuafiyetBasvurular as any);
  app.post('/muafiyet-basvuru/:id/onayla', danismanController.onaylaMuafiyetBasvuru as any);
  app.post('/muafiyet-basvuru/:id/reddet', danismanController.reddetMuafiyetBasvuru as any);
  app.get('/muafiyet-basvuru/:id/download-sgk4a', danismanController.downloadMuafiyetSgk4a as any);
}
