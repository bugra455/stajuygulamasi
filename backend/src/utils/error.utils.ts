import { FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export interface PrismaError extends Error {
  code?: string;
}

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'ApiError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Hatalı istek') {
    super(message, 400);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Yetkisiz erişim') {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Erişim engellendi') {
    super(message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Kaynak bulunamadı') {
    super(message, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Veri çakışması') {
    super(message, 409);
  }
}

export class ErrorHandler {
  static handleError(error: unknown, reply: FastifyReply): void {
    // Use proper logging service instead of console.error
    
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send({
        success: false,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
      return;
    }

    // Handle Prisma errors
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2002') {
      reply.status(409).send({
        success: false,
        message: 'Bu veriler zaten sistemde mevcut.',
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      reply.status(404).send({
        success: false,
        message: 'Kayıt bulunamadı.',
      });
      return;
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      reply.status(400).send({
        success: false,
        message: 'Girdi verileri geçersiz.',
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    // Handle file upload errors
    if (error instanceof Error && error.message.includes('request file too large')) {
      reply.status(400).send({
        success: false,
        message: 'Dosya boyutu çok büyük. Maksimum 50MB yükleyebilirsiniz.',
      });
      return;
    }

    // Handle Fastify multipart errors
    if (error instanceof Error && error.message.includes('multipart')) {
      reply.status(400).send({
        success: false,
        message: 'Dosya yükleme hatası. Lütfen tekrar deneyin.',
      });
      return;
    }

    // Default server error
    const err = error as Error;
    reply.status(500).send({
      success: false,
      message: 'Sunucu hatası oluştu.',
      // Stack trace sadece development'te göster ve sadece console'da
      ...(process.env.NODE_ENV === 'development' && { 
        error: err.message
      })
    });
    
    // Log full error details to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Server Error Details:', {
        message: err.message,
        stack: err.stack
      });
    }
  }

  static createSuccessResponse<T>(data: T, message?: string) {
    return {
      success: true,
      ...(message && { message }),
      data
    };
  }

  static createErrorResponse(message: string, errors?: Record<string, unknown>) {
    return {
      success: false,
      message,
      ...(errors && { errors })
    };
  }
}
