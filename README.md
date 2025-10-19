# StajKontrol - Student Internship Management System

A comprehensive web-based system for managing student internships, built with modern web technologies. The system provides functionality for internship applications, document management, company approvals, and administrative oversight.

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: 
  - MySQL (Primary database with Prisma ORM)
  - MongoDB (Logging and analytics)
- **Authentication**: JWT with bcrypt
- **Email Service**: Nodemailer
- **File Processing**: Excel/XLSX support
- **Security**: Helmet, CORS, Rate limiting, XSS protection
- **Real-time**: WebSocket support
- **Task Queue**: BullMQ
- **Validation**: Zod

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router DOM
- **Forms**: React Hook Form
- **Internationalization**: i18next + react-i18next
- **Markdown**: React Markdown
- **Real-time**: WebSocket client
- **HTTP Client**: Native fetch

## 📋 Requirements

- **Node.js**: v18 or higher
- **npm**: v8 or higher
- **MySQL**: v8.0 or higher
- **MongoDB**: v5.0 or higher (for logging)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd STAJKONTROL_GIT
```

### 2. Install All Dependencies
```bash
npm run install:all
```

This command will install dependencies for the root project, frontend, and backend.

### 3. Environment Configuration

#### Backend Environment Variables
Copy the example environment file and configure it:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/stajkontrol_db"

# MongoDB for Logging
MONGODB_URI="mongodb://localhost:27017/stajkontrol_logs"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"
JWT_EXPIRATION="24h"

# Server Configuration
PORT=3000
NODE_ENV="development"

# CORS Configuration
FRONTEND_URL="http://localhost:5173"

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="Staj Kontrol Sistemi" <no-reply@stajkontrol.com>

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR="./uploads"
ALLOWED_FILE_TYPES="application/pdf"

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

#### Frontend Environment Variables
If a frontend `.env.example` exists, copy and configure it:
```bash
cp frontend/.env.example frontend/.env
```

### 4. Database Setup

#### Initialize the Database
```bash
cd backend
npx prisma migrate reset --force
npm run seed
```

#### For Demo Data
```bash
npm run demo-seed
```

## 🚀 Running the Application

### Development Mode

#### Option 1: Start Both Services (Recommended)
```bash
npm run dev
```
This will start both frontend and backend servers with local network access.

#### Option 2: Start Services Separately
```bash
# Start backend
npm run start:backend

# Start frontend (in another terminal)
npm run start:frontend
```

### Production Mode
```bash
# Build the application
npm run build

# Start backend in production
cd backend && npm start
```

## 📋 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend for local network access
- `npm run start:frontend` - Start frontend development server
- `npm run start:backend` - Start backend development server
- `npm run install:all` - Install dependencies for all packages
- `npm run build` - Build frontend application
- `npm run build:backend` - Build backend application

### Backend Scripts
- `npm run dev` - Start backend in development mode
- `npm run dev:watch` - Start backend with file watching
- `npm run build` - Build backend for production
- `npm run start` - Start built backend application
- `npm run seed` - Seed the database with initial data
- `npm run demo-seed` - Seed the database with demo data
- `npm run db:reset` - Reset database and run seeding
- `npm run db:demo` - Reset database and run demo seeding

### Frontend Scripts
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview built application

## 🌐 Access URLs

When running in development mode:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs (Swagger UI)
- **Network Access**: The `npm run dev` command will display your local IP for network access

## 📖 API Documentation

The application includes comprehensive API documentation using OpenAPI/Swagger:

### Features
- **Interactive API Explorer**: Test endpoints directly from the browser
- **Comprehensive Schema Documentation**: Request/response models with examples
- **Authentication Support**: JWT Bearer token integration
- **Role-based Access Control**: Restricted access for security

### Access Control
The API documentation is accessible only to users with role YONETICI

### Accessing Documentation
1. Start the backend server: `npm run start:backend`
2. Navigate to: http://localhost:3000/api/docs
3. Login with appropriate credentials (admin, career center, or advisor account)
4. Use the "Authorize" button to add your JWT token for testing endpoints

### Security
- JWT authentication required for access
- Role-based restrictions implemented
- Comprehensive error handling documented
- Input validation schemas included

## 📁 Project Structure

```
STAJKONTROL_GIT/
├── README.md
├── package.json                 # Root package configuration
├── start-local-network.sh       # Development startup script
│
├── backend/                     # Backend application
│   ├── src/
│   │   ├── controllers/         # API route handlers
│   │   ├── services/           # Business logic services
│   │   ├── utils/              # Utility functions
│   │   ├── lib/                # Libraries and configuration
│   │   └── index.ts            # Application entry point
│   ├── prisma/                 # Database schema and migrations
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Frontend React application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Utility functions
│   │   └── main.tsx            # Application entry point
│   ├── package.json
│   └── .env.example
```

## 🔧 Environment Variables

### Required Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL database connection string | `mysql://user:pass@localhost:3306/db` |
| `MONGODB_URI` | MongoDB connection for logging | `mongodb://localhost:27017/logs` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_USER` | Email username | `your-email@gmail.com` |
| `SMTP_PASS` | Email password/app password | `your-app-password` |

### Optional Backend Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `MAX_FILE_SIZE` | Maximum upload size | `5242880` (5MB) |
| `JWT_EXPIRATION` | JWT expiration time | `24h` |

## 📝 Features

- Student internship application management
- Company approval workflows
- Document upload and management (PDF, Excel)
- Email notifications
- Real-time updates via WebSocket
- Administrative dashboard
- Internationalization support
- File processing and validation

## 🛡️ Security

The application implements several security measures:
- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- XSS protection
- File type validation
- Input sanitization
