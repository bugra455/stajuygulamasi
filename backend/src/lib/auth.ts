import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from './config.js';
import { UserType } from '../generated/prisma/index.js';
import { SessionService } from '../services/sessionService.js';

export function hashPassword(password: string) {
  return bcrypt.hash(password, config.BCRYPT_ROUNDS);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { id: number; email: string; userType: string; sessionId?: string }) {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables.');
  }
  
  // Generate a unique session ID if not provided
  const sessionId = payload.sessionId || generateSessionId();
  
  return jwt.sign(
    { ...payload, sessionId }, 
    config.JWT_SECRET, 
    { 
      expiresIn: '1d', // 1 day expiration
      issuer: 'stajkontrol-app',
      audience: 'stajkontrol-users'
    } as jwt.SignOptions
  );
}

// Generate unique session ID
function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: { 
    id: number;
    email: string;
    userType: string;
    sessionId: string;
  };
}

export function verifyToken(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new Error('Authorization başlığı eksik.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Token bulunamadı.');
  }

  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET tanımlı değil.');
  }

  try {
    return jwt.verify(token, config.JWT_SECRET, {
      issuer: 'stajkontrol-app',
      audience: 'stajkontrol-users'
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token süresi dolmuş.');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Geçersiz token.');
    }
    throw new Error('Token doğrulama hatası.');
  }
}

// Authentication middleware functions
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = verifyToken(request) as any;
    
    // Check if session is valid
    if (decoded.sessionId) {
      const isValidSession = await SessionService.isSessionValid(decoded.sessionId);
      if (!isValidSession) {
        return reply.code(401).send({ error: 'Session expired or invalid.' });
      }
    }
    
    (request as AuthenticatedRequest).user = decoded;
  } catch (error) {
    return reply.code(401).send({ error: (error as Error).message });
  }
}

export function requireAnyRole(allowedRoles: UserType[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    
    // Check if reply was already sent by requireAuth
    if (reply.sent) {
      return;
    }
    
    const authRequest = request as AuthenticatedRequest;
    if (!allowedRoles.includes(authRequest.user?.userType as UserType)) {
      return reply.code(403).send({ error: 'Bu işlem için yeterli yetkiniz bulunmamaktadır.' });
    }
  };
}