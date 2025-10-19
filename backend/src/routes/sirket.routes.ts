import { FastifyInstance } from 'fastify';
import { sirketGiris, sirketOnay, sirketDefterOnay, testOtpGonder, sirketDosyaIndir } from '../controllers/sirket.controller.js';

export async function sirketRoutes(fastify: FastifyInstance) {
  // Şirket OTP girişi (ana route)
  fastify.post('/sirketgiris', sirketGiris);
  
  // Şirket girişi (kısa route - aynı fonksiyona yönlendir)
  fastify.post('/giris', sirketGiris);
  
  // Şirket başvuru onay/red (uzun route)
  fastify.post('/sirketonay', sirketOnay);
  
  // Şirket başvuru onay/red (kısa route)
  fastify.post('/onay', sirketOnay);
  
  // Şirket defter onay/red (uzun route)
  fastify.post('/defteronay', sirketDefterOnay);
  
  // Şirket defter onay/red (kısa route)
  fastify.post('/defter-onay', sirketDefterOnay);
  
  // Test OTP gönderme (development)
  fastify.post('/test-otp', testOtpGonder);

  // Şirket dosya indirme (transkript, hizmet dökümü, sigorta, defter)
  fastify.get('/download/:basvuruId/:fileType', sirketDosyaIndir);
}
