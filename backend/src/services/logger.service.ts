import { FastifyRequest } from "fastify";
import LogModel, { ILog } from "../models/log.model.js";
import MongoDBConnection from "../lib/mongodb.js";
import { LogDetails } from "../types/common.types.js";

export enum LogAction {
  // Authentication
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  LOGIN_FAILED = "LOGIN_FAILED",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  TOKEN_VALIDATION_FAILED = "TOKEN_VALIDATION_FAILED",
  SESSION_EXPIRED = "SESSION_EXPIRED",

  // API Operations
  API_REQUEST = "API_REQUEST",
  API_RESPONSE = "API_RESPONSE",
  API_ERROR = "API_ERROR",

  // Staj Başvurusu - CRUD Operations
  BASVURU_CREATE = "BASVURU_CREATE",
  BASVURU_UPDATE = "BASVURU_UPDATE",
  BASVURU_DELETE = "BASVURU_DELETE",
  BASVURU_VIEW = "BASVURU_VIEW",
  BASVURU_LIST = "BASVURU_LIST",
  BASVURU_CANCEL = "BASVURU_CANCEL",

  // Approval/Rejection Actions
  HOCA_ONAYLADI = "HOCA_ONAYLADI",
  HOCA_REDDETTI = "HOCA_REDDETTI",
  KARIYER_MERKEZI_ONAYLADI = "KARIYER_MERKEZI_ONAYLADI",
  KARIYER_MERKEZI_REDDETTI = "KARIYER_MERKEZI_REDDETTI",
  SIRKET_ONAYLADI = "SIRKET_ONAYLADI",
  SIRKET_REDDETTI = "SIRKET_REDDETTI",

  // Defter Operations
  DEFTER_UPLOAD = "DEFTER_UPLOAD",
  DEFTER_DOWNLOAD = "DEFTER_DOWNLOAD",
  DEFTER_DELETE = "DEFTER_DELETE",
  DEFTER_UPDATE = "DEFTER_UPDATE",
  DEFTER_YUKLENDI = "DEFTER_YUKLENDI",
  DEFTER_SIRKET_ONAYLADI = "DEFTER_SIRKET_ONAYLADI",
  DEFTER_SIRKET_REDDETTI = "DEFTER_SIRKET_REDDETTI",
  DEFTER_DANISMAN_ONAYLADI = "DEFTER_DANISMAN_ONAYLADI",
  DEFTER_DANISMAN_REDDETTI = "DEFTER_DANISMAN_REDDETTI",

  // File Operations
  FILE_UPLOAD = "FILE_UPLOAD",
  FILE_DOWNLOAD = "FILE_DOWNLOAD",
  FILE_DELETE = "FILE_DELETE",
  TRANSCRIPT_DOWNLOAD = "TRANSCRIPT_DOWNLOAD",
  SIGORTA_DOWNLOAD = "SIGORTA_DOWNLOAD",
  HIZMET_DOKUMU_DOWNLOAD = "HIZMET_DOKUMU_DOWNLOAD",

  // User Management
  USER_CREATE = "USER_CREATE",
  USER_UPDATE = "USER_UPDATE",
  USER_DELETE = "USER_DELETE",
  USER_VIEW = "USER_VIEW",
  USER_LIST = "USER_LIST",

  // Search Operations
  SEARCH_BASVURULAR = "SEARCH_BASVURULAR",
  SEARCH_DEFTERLER = "SEARCH_DEFTERLER",
  SEARCH_OGRENCILER = "SEARCH_OGRENCILER",

  // Email Operations
  EMAIL_SENT = "EMAIL_SENT",
  EMAIL_FAILED = "EMAIL_FAILED",
  OTP_SENT = "OTP_SENT",
  OTP_VERIFIED = "OTP_VERIFIED",
  OTP_FAILED = "OTP_FAILED",

  // Security Events
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",

  // System Events
  SYSTEM_STARTUP = "SYSTEM_STARTUP",
  SYSTEM_SHUTDOWN = "SYSTEM_SHUTDOWN",
  SYSTEM_CLEANUP = "SYSTEM_CLEANUP",
  DATABASE_ERROR = "DATABASE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SERVER_ERROR = "SERVER_ERROR",

  // Business Logic
  OLUSTURULDU = "OLUSTURULDU",
  GUNCELLEDI = "GUNCELLEDI",
  IPTAL_EDILDI = "IPTAL_EDILDI",
}

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

export interface LogOptions {
  action: LogAction;
  level?: LogLevel;
  userId?: number;
  userEmail?: string;
  userType?: string;
  details?: LogDetails;
  errorMessage?: string;
  stackTrace?: string;
  statusCode?: number;
  responseTime?: number;
  traceId?: string;
}

class LoggerService {
  private static instance: LoggerService;
  private mongoConnection: MongoDBConnection;
  private isInitialized: boolean = false;
  private mongoAvailable: boolean = true;

  private constructor() {
    this.mongoConnection = MongoDBConnection.getInstance();
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // MongoDB connection should already be established by the server
      if (!this.mongoConnection.getConnectionStatus()) {
        // Do not throw here to allow worker processes (that may not initialize Mongo)
        // to continue running; fallback to console-only logging.
        this.mongoAvailable = false;
        this.isInitialized = true;
        console.warn('⚠️ MongoDB Logger Service not connected - falling back to console-only logging');
        return;
      }

      this.mongoAvailable = true;
      this.isInitialized = true;

      if (process.env.NODE_ENV === "development") {
        console.log("✅ MongoDB Logger Service initialized successfully");
      }
    } catch (error) {
      console.error("❌ Failed to initialize MongoDB Logger Service:", error);
      // If initialization fails, switch to console-only logging instead of throwing
      this.mongoAvailable = false;
      this.isInitialized = true;
    }
  }

  private getClientIP(request: FastifyRequest): string {
    const forwarded = request.headers["x-forwarded-for"] as string;
    const realIP = request.headers["x-real-ip"] as string;
    const remoteAddress = request.socket.remoteAddress;

    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (remoteAddress) {
      return remoteAddress.replace("::ffff:", "");
    }
    return "unknown";
  }

  private sanitizeRequest(request: FastifyRequest): Partial<FastifyRequest> {
    // Remove sensitive information from request
    const sanitized: any = {
      method: request.method,
      url: request.url,
      headers: { ...request.headers },
      params: request.params,
      query: request.query,
    };

    // Remove sensitive headers
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    sensitiveHeaders.forEach((header) => {
      if (sanitized.headers[header]) {
        sanitized.headers[header] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  public async log(
    request: FastifyRequest | null,
    options: LogOptions
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const logData: Partial<ILog> = {
        level: this.mapLogLevel(options.level || LogLevel.INFO),
        action: options.action,
        userId: options.userId,
        userEmail: options.userEmail,
        userType: options.userType,
        details: options.details,
        errorMessage: options.errorMessage,
        stackTrace: options.stackTrace,
        statusCode: options.statusCode,
        responseTime: options.responseTime,
        traceId: options.traceId || (request ? String(request.id) : undefined),
        timestamp: new Date(Date.now() + 3 * 60 * 60 * 1000)
      };

      if (request) {
        logData.ipAddress = this.getClientIP(request);
        logData.userAgent = request.headers["user-agent"];
        logData.endpoint = request.url;
        logData.method = request.method;

        // Add sanitized request data for debugging
        if (
          options.level === LogLevel.DEBUG ||
          process.env.NODE_ENV === "development"
        ) {
          logData.details = {
            ...logData.details,
            request: this.sanitizeRequest(request),
          };
        }
      }

      // Save to MongoDB if available; otherwise skip persistence and continue
      try {
        if (this.mongoAvailable && this.mongoConnection.getConnectionStatus()) {
          const log = new LogModel(logData);
          await log.save();
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ MongoDB not available - skipping persistent log write');
          }
        }
      } catch (persistError) {
        // If persisting fails, mark mongo as unavailable to avoid repeated errors
        this.mongoAvailable = false;
        console.error('⚠️ Failed to persist log to MongoDB, switching to console-only logging:', persistError);
      }

      // Development console output
      if (process.env.NODE_ENV === "development") {
        this.logToConsole(
          options.level || LogLevel.INFO,
          options.action,
          logData
        );
      }
    } catch (error) {
  // Critical: If logging fails, print to console. Don't crash the process.
  console.error("❌ [CRITICAL] Logger Service failed:", error);
  // Do not re-throw - worker processes should continue even if logging is flaky
    }
  }

  private mapLogLevel(level: LogLevel): number {
    const levelMap = {
      [LogLevel.DEBUG]: 10,
      [LogLevel.INFO]: 20,
      [LogLevel.WARN]: 30,
      [LogLevel.ERROR]: 40,
      [LogLevel.FATAL]: 50,
    };
    return levelMap[level] || 20;
  }

  private logToConsole(
    level: LogLevel,
    action: LogAction,
    logData: Partial<ILog>
  ): void {
    const timestamp = new Date().toISOString();
    const user = logData.userEmail || "Anonymous";
    const ip = logData.ipAddress || "unknown";
    const endpoint = logData.endpoint || "";

    const levelEmoji = {
      [LogLevel.DEBUG]: "🔍",
      [LogLevel.INFO]: "ℹ️",
      [LogLevel.WARN]: "⚠️",
      [LogLevel.ERROR]: "❌",
      [LogLevel.FATAL]: "💀",
    };

    const message = `${
      levelEmoji[level]
    } [${level.toUpperCase()}] ${action} | ${user} | ${ip} ${endpoint}`;

    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`${timestamp} ${message}`);
        if (logData.errorMessage)
          console.error(`  Error: ${logData.errorMessage}`);
        break;
      case LogLevel.WARN:
        console.warn(`${timestamp} ${message}`);
        break;
      default:
        console.log(`${timestamp} ${message}`);
    }
  }

  // Convenience methods for common operations
  public async logAuth(
    request: FastifyRequest,
    action: LogAction,
    userEmail: string,
    userType: string,
    userId?: number,
    success: boolean = true
  ): Promise<void> {
    await this.log(request, {
      action,
      level: success ? LogLevel.INFO : LogLevel.WARN,
      userId,
      userEmail,
      userType,
      statusCode: success ? 200 : 401,
      details: { success },
    });
  }

  public async logBasvuru(
    request: FastifyRequest,
    action: LogAction,
    userEmail: string,
    userType: string,
    userId: number,
    basvuruDetails: LogDetails
  ): Promise<void> {
    await this.log(request, {
      action,
      level: LogLevel.INFO,
      userId,
      userEmail,
      userType,
      statusCode: 200,
      details: basvuruDetails,
    });
  }

  public async logError(
    request: FastifyRequest | null,
    error: Error & { statusCode?: number },
    userEmail?: string,
    userType?: string,
    userId?: number
  ): Promise<void> {
    await this.log(request, {
      action: LogAction.API_ERROR,
      level: LogLevel.ERROR,
      userId,
      userEmail,
      userType,
      errorMessage: error.message || String(error),
      stackTrace: error.stack,
      statusCode: error.statusCode || 500,
    });
  }

  public async logSecurity(
    request: FastifyRequest,
    action: LogAction,
    details: LogDetails,
    userEmail?: string
  ): Promise<void> {
    await this.log(request, {
      action,
      level: LogLevel.WARN,
      userEmail,
      details: {
        ...details,
        securityEvent: true,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // MongoDB connection status check
  public getConnectionStatus(): boolean {
    return this.mongoConnection.getConnectionStatus();
  }
}

export default LoggerService;
