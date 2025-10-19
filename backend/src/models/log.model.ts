import mongoose, { Schema, Document } from 'mongoose';
import { LogDetails } from '../types/common.types.js';

export interface ILog extends Document {
  level: number;
  traceId?: string;
  action: string;
  userId?: number;
  userEmail?: string;
  userType?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  timestamp: Date;
  details?: LogDetails;
  errorMessage?: string;
  stackTrace?: string;
}

const LogSchema: Schema = new Schema({
  level: { type: Number, default: 20, index: true }, // 10=DEBUG, 20=INFO, 30=WARN, 40=ERROR, 50=FATAL
  traceId: { type: String }, // Remove index: true from here since we define it separately below
  action: { type: String, required: true, index: true },
  userId: { type: Number, index: true },
  userEmail: { type: String, index: true },
  userType: { type: String, index: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  endpoint: { type: String, index: true },
  method: { type: String },
  statusCode: { type: Number, index: true },
  responseTime: { type: Number },
  timestamp: { type: Date, default: Date.now, index: true, expires: '90d' }, // TTL index for 90 days
  details: { type: Schema.Types.Mixed },
  errorMessage: { type: String },
  stackTrace: { type: String }
}, {
  collection: 'logs',
  versionKey: false
});

// Compound indexes for better query performance
LogSchema.index({ timestamp: -1, level: 1 });
LogSchema.index({ action: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });
LogSchema.index({ userEmail: 1, timestamp: -1 });
LogSchema.index({ level: 1, timestamp: -1 }); // For error/warning queries
LogSchema.index({ traceId: 1 }); // For tracing requests

export default mongoose.model<ILog>('Log', LogSchema);
