import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { cronService } from '../services/cron.service.js';
import { requireAnyRole } from '../lib/auth.js';
import { UserType } from '../generated/prisma/index.js';

export async function cronRoutes(fastify: FastifyInstance) {
  
  // Manual reminder test endpoint (admin only)
  fastify.post('/test-reminders', {
    preHandler: [requireAnyRole([UserType.YONETICI])],
    schema: {
      tags: ['Admin', 'Cron'],
      description: 'Test reminder emails manually (Admin only)',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Test reminder sistemini manuel olarak çalıştır
      await cronService.checkAndSendReminders();
      
      return reply.send({
        success: true,
        message: 'Hatırlatma kontrolü manuel olarak çalıştırıldı',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Manual reminder test error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Hatırlatma testi sırasında hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  });

  // Get cron status endpoint
  fastify.get('/status', {
    preHandler: [requireAnyRole([UserType.YONETICI])],
    schema: {
      tags: ['Admin', 'Cron'],
      description: 'Get cron jobs status (Admin only)',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            cronJobsActive: { type: 'boolean' },
            timestamp: { type: 'string' },
            nextRun: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const nextRun = new Date();
      nextRun.setHours(10, 0, 0, 0); // Next 10:00 AM
      if (nextRun <= new Date()) {
        nextRun.setDate(nextRun.getDate() + 1); // Tomorrow 10:00 AM
      }

      return reply.send({
        success: true,
        cronJobsActive: true,
        timestamp: new Date().toISOString(),
        nextRun: nextRun.toISOString()
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: 'Cron durumu alınamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  });
}

export default cronRoutes;