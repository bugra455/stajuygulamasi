import { FastifyInstance } from 'fastify';
import { verifyToken, AuthenticatedRequest } from '../lib/auth.js';
import * as kariyerController from '../controllers/kariyer.controller.js';

export default async function kariyerRoutes(fastify: FastifyInstance) {
  // Middleware: Her kariyer merkezi isteğinden önce token'ı doğrula ve rol kontrolü yap
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const payload = verifyToken(request) as { id: number; email: string; userType: string; sessionId: string };
      
      // Sadece KARIYER_MERKEZI rolündeki kullanıcılar bu endpoint'lere erişebilir
      if (payload.userType !== 'KARIYER_MERKEZI') {
        return reply.status(403).send({ 
          message: 'Bu işlem için kariyer merkezi yetkisi gereklidir.' 
        });
      }
      
      (request as AuthenticatedRequest).user = {
        id: payload.id,
        email: payload.email,
        userType: payload.userType,
        sessionId: payload.sessionId || ''
      };
    } catch (error: unknown) {
      const err = error as Error;
      return reply.status(401).send({ message: err.message });
    }
  });

  // Kariyer Merkezi Başvuru Yönetimi (Sadece KARIYER_MERKEZI)
  fastify.get('/basvurular', kariyerController.getAllBasvurular);
  fastify.get('/basvurular/:id', kariyerController.getBasvuru);
  fastify.post('/basvurular/:id/onayla', kariyerController.onaylaBasvuru);
  fastify.post('/basvurular/:id/reddet', kariyerController.reddetBasvuru);

  // Belge indirme
  fastify.get('/basvurular/:id/download/:fileType', kariyerController.downloadBasvuruDosyasi);
  
  // Kullanıcı Yönetimi (Sadece KARIYER_MERKEZI)
  fastify.get('/users', kariyerController.getAllUsers);
  fastify.get('/danismanlar', kariyerController.getAllDanismanlar);
  fastify.get('/ogrenciler', kariyerController.getAllOgrenciler);
  fastify.get('/sirketler', kariyerController.getAllSirketler);
  //fastify.put('/users/:id', kariyerController.updateUser);
  // updateBasvuru endpoint removed: career center can no longer update student applications via this API.
  
  // Arama ve Filtreleme Endpoints (Sadece KARIYER_MERKEZI)
  fastify.get('/bolumler', kariyerController.getBolumler);
  fastify.get('/staj-tipleri', kariyerController.getStajTipleri);
  fastify.get('/basvurular/search', kariyerController.searchKariyerBasvurular);
  fastify.get('/onaylanmis-basvurular/search', kariyerController.searchOnaylanmisBasvurular);
  fastify.get('/ogrenciler/search', kariyerController.searchKariyerOgrenciler);
  fastify.get('/danismanlar/search', kariyerController.searchKariyerDanismanlar);
  fastify.get('/sirketler/search', kariyerController.searchKariyerSirketler);
  
  // Detay Modal Endpoints (Sadece KARIYER_MERKEZI)
  fastify.get('/ogrenciler/:id/detay', kariyerController.getOgrenciDetay);
  fastify.get('/danismanlar/:id/detay', kariyerController.getDanismanDetay);
  fastify.get('/sirketler/:kurumAdi/detay', kariyerController.getSirketDetay);
  
  // Personel Bilgileri (Sadece KARIYER_MERKEZI)
  fastify.get('/personel', kariyerController.getPersonelBilgisi);
  fastify.put('/personel', kariyerController.updatePersonelBilgisi);
  
  // Danışman Yönetimi (Sadece KARIYER_MERKEZI)
  fastify.get('/hocalar', kariyerController.getAllHocalar);
  fastify.get('/hoca/:tcKimlik', kariyerController.getHoca);
  fastify.put('/hoca/:tcKimlik', kariyerController.updateHoca);

  // Öğrencinin tüm başvurularını getir (kariyer merkezi)
  fastify.get('/ogrenci/:ogrenciId/basvurular', kariyerController.getOgrenciTumBasvurulari);
}
