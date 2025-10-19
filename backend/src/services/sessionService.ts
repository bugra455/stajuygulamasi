import { prisma } from '../lib/prisma.js';
import { FastifyRequest } from 'fastify';

export class SessionService {
  // Create a new session
  static async createSession(
    userId: number, 
    sessionId: string, 
    request: FastifyRequest
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiration

    await prisma.userSession.create({
      data: {
        userId,
        sessionId,
        expiresAt,
        userAgent: request.headers['user-agent'] || null,
        ipAddress: this.getClientIp(request)
      }
    });
  }

  // Invalidate all other sessions for a user (except current)
  static async invalidateOtherSessions(userId: number, currentSessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        userId,
        sessionId: { not: currentSessionId },
        isActive: true
      },
      data: {
        isActive: false
      }
    });
  }

  // Check if session is valid
  static async isSessionValid(sessionId: string): Promise<boolean> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionId }
      });

      if (!session || !session.isActive) {
        return false;
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        await this.invalidateSession(sessionId);
        return false;
      }

      // Update last access - use updateMany to avoid concurrency issues
      try {
        await prisma.userSession.updateMany({
          where: { 
            sessionId,
            isActive: true 
          },
          data: { lastAccess: new Date() }
        });
      } catch {
        // If update fails due to concurrency, ignore silently
      }

      return true;
    } catch {
      // In case of database errors, don't invalidate the session immediately
      // This prevents logout issues during temporary DB problems
      return true;
    }
  }

  // Invalidate a specific session
  static async invalidateSession(sessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { sessionId },
      data: { isActive: false }
    });
  }

  // Invalidate all sessions for a user
  static async invalidateAllUserSessions(userId: number): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false }
    });
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<void> {
    await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      }
    });
  }

  // Get client IP address
  private static getClientIp(request: FastifyRequest): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];
    
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    
    if (typeof xRealIp === 'string') {
      return xRealIp;
    }
    
    return request.ip || 'unknown';
  }
}
