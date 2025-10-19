import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { config } from '../lib/config.js';
import { ValidationUtils } from './validation.utils.js';

const pump = promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FileUploadData {
  filename: string;
  file: NodeJS.ReadableStream;
  mimetype: string;
  fieldname: string;
}

export class FileService {
  private static uploadDir = path.resolve(__dirname, '../../uploads');

  static async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true, mode: 0o750 });
    }
  }

  static generateSecureFilePath(originalFilename: string): string {
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const secureFilename = `${randomUUID()}${fileExtension}`;
    return path.join(this.uploadDir, secureFilename);
  }

  static async saveFile(fileData: FileUploadData): Promise<string> {
    ValidationUtils.validateFile(fileData);
    await this.ensureUploadDirectory();
    
    const uploadPath = this.generateSecureFilePath(fileData.filename);
    
    try {
      // Create write stream with size monitoring
      const writeStream = createWriteStream(uploadPath);
      let totalSize = 0;
      
      // Monitor file size during upload
      fileData.file.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > config.MAX_FILE_SIZE) {
          writeStream.destroy();
          throw new Error(`Dosya boyutu çok büyük. Maksimum ${this.formatFileSize(config.MAX_FILE_SIZE)} yükleyebilirsiniz.`);
        }
      });
      
      await pump(fileData.file, writeStream);
      return uploadPath;
    } catch (error) {
      // Clean up partial file on error
      try {
        await this.deleteFile(uploadPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Dosya yüklenirken bir hata oluştu.');
    }
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Use proper logging instead of console.error
      // Don't throw error, just log it as the file might already be deleted
    }
  }

  static async replaceFile(oldFilePath: string, newFileData: FileUploadData): Promise<string> {
    const newFilePath = await this.saveFile(newFileData);
    
    // Delete old file after successful upload
    if (oldFilePath) {
      await this.deleteFile(oldFilePath);
    }
    
    return newFilePath;
  }

  static validateFileUpload(data: FileUploadData): void {
    ValidationUtils.validateFile(data);
  }

  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  static isValidFileType(filename: string): boolean {
    const allowedExtensions = ['.pdf'];
    const extension = this.getFileExtension(filename);
    return allowedExtensions.includes(extension);
  }

  static isValidMimeType(mimetype: string): boolean {
    const allowedMimeTypes = config.ALLOWED_FILE_TYPES.split(',');
    return allowedMimeTypes.includes(mimetype);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async cleanupFiles(filePaths: string[]): Promise<void> {
    await Promise.all(
      filePaths.map(filePath => 
        this.deleteFile(filePath).catch(() => {
          // Ignore individual cleanup errors, just continue
        })
      )
    );
  }
}
