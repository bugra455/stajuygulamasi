#!/usr/bin/env node

// Alternative entry point that ensures environment variables are loaded
// This can be used if the main approach doesn't work

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables manually if needed
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Environment variables loaded from', envPath);
} else {
  console.log('⚠️  No .env file found at', envPath);
}

// Now start the main application
import('./index.js');
