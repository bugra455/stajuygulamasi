export const config = {
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
  
  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
  BODY_LIMIT: parseInt(process.env.BODY_LIMIT || '104857600'), // 100MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || 'application/pdf',
  
  // Debug
  DEBUG_LOGGING: process.env.DEBUG_LOGGING === 'true',
  PRISMA_LOG_QUERIES: process.env.PRISMA_LOG_QUERIES === 'true',
  
  // Validation
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV === 'development',
  
  // Debug environment variables (for development)
  debug: () => {
    console.log('🔍 Environment Variables Debug:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURED***' : '***MISSING***');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***CONFIGURED***' : '***MISSING***');
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  },
  
  // Validate required environment variables
  validate: () => {
    const required = ['JWT_SECRET', 'DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
      console.error('🔍 Current environment variables:');
      required.forEach(key => {
        console.error(`  ${key}: ${process.env[key] ? '***SET***' : '***NOT SET***'}`);
      });
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log('✅ All required environment variables are configured');
  }
};
