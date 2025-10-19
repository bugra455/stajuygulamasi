import { config } from '../lib/config.js';

/**
 * Debug utility for conditional logging
 */
export class DebugUtils {
  /**
   * Log only if debug logging is enabled
   */
  static log(...args: any[]): void {
    if (config.DEBUG_LOGGING || config.isDevelopment()) {
      console.log(...args);
    }
  }

  /**
   * Always log important information
   */
  static info(...args: any[]): void {
    console.log(...args);
  }

  /**
   * Always log warnings
   */
  static warn(...args: any[]): void {
    console.warn(...args);
  }

  /**
   * Always log errors
   */
  static error(...args: any[]): void {
    console.error(...args);
  }
}
