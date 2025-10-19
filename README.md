# StajKontrol - Öğrenci Staj Yönetim Sistemi

Modern web teknolojileriyle geliştirilmiş kapsamlı bir **öğrenci staj yönetim sistemi**dir.  Sistem; staj başvuruları, belge yönetimi, firma onay süreçleri ve idari denetim için işlevler sunar.
Kullanılmasından vazgeçildiği için hurdaya çıkartıldı, umarım inceleyecek kişiye de güzel bir kaynak olur.

## 🚀 Teknoloji Yığını

### Backend
- **Çalışma Zamanı**: Node.js (TypeScript ile)
- **Framework**: Fastify
- **Veritabanı**:  
  - MySQL (Prisma ORM ile birincil veritabanı)  
  - MongoDB (Loglama ve analiz için)
- **Kimlik Doğrulama**: JWT + bcrypt
- **E-posta Servisi**: Nodemailer
- **Dosya İşleme**: Excel/XLSX desteği
- **Güvenlik**: Helmet, CORS, Hız sınırlama, XSS koruması
- **Gerçek Zamanlı**: WebSocket desteği
- **Görev Kuyruğu**: BullMQ
- **Doğrulama**: Zod

### Frontend
- **Framework**: ReactJS (TypeScript ile)
- **Derleme Aracı**: Vite
- **Stil**: TailwindCSS
- **Yönlendirme**: React Router DOM
- **Formlar**: React Hook Form
- **Çok Dillilik**: i18next + react-i18next
- **Markdown**: React Markdown
- **Gerçek Zamanlı**: WebSocket istemcisi
- **HTTP İstemcisi**: Native fetch

## 📋 Gereksinimler

- **Node.js**: v18 veya üzeri  
- **npm**: v8 veya üzeri  
- **MySQL**: v8.0 veya üzeri  
- **MongoDB**: v5.0 veya üzeri (loglama için)

## 🛠️ Kurulum ve Başlangıç

### 1. Depoyu Klonla
```bash
git clone <repository-url>
cd STAJKONTROL_GIT
```
### 2. Tüm Bağımlılıkları Yükle
```bash
   npm i
```
### 3. Ortam Değişkenlerini Ayarla
Backend Ortam Değişkenleri

Örnek dosyayı kopyala ve düzenle:
```bash
cp backend/.env.example backend/.env
```

### 4. Veritabanı Kurulumu
```bash
cd backend
npx prisma migrate reset --force
npm run seed
npm run demo-seed
```
## 🚀 Uygulamayı Çalıştırma
Geliştirme Modu
```bash
cd ./backend && docker compose up -d && ../.start-local-network.sh
```
## 📋 Kullanılabilir Komutlar
Root
```bash
npm run dev - Frontend ve backend’i aynı anda başlatır

npm run start:frontend - Frontend geliştirme sunucusunu başlatır

npm run start:backend - Backend geliştirme sunucusunu başlatır

npm run install:all - Tüm bağımlılıkları yükler

npm run build - Frontend’i derler

npm run build:backend - Backend’i derler
```

Backend
```bash
npm run dev - Backend geliştirme modu

npm run dev:watch - Dosya izleme ile geliştirme modu

npm run build - Production için derleme

npm run start - Derlenmiş backend’i başlatma

npm run seed - Başlangıç verilerini yükleme

npm run demo-seed - Demo verilerini yükleme

npm run db:reset - Veritabanını sıfırla ve seed et

npm run db:demo - Veritabanını sıfırla ve demo verilerini yükle

```
Frontend
```bash
npm run dev - Frontend geliştirme sunucusu

npm run build - Production için derleme

npm run lint - ESLint çalıştırır

npm run preview - Derlenmiş uygulamayı önizler
```
Frontend: http://localhost:5173
Backend API: http://localhost:3000
API Dokümantasyonu: http://localhost:3000/api/docs
``` bash
STAJKONTROL_GIT/
├── README.md
├── package.json
├── start-local-network.sh
│
├── backend/
│   ├── src/
│   │   ├── controllers/    # API route handler’ları
│   │   ├── services/      # İş mantığı servisleri
│   │   ├── utils/         # Yardımcı fonksiyonlar
│   │   ├── lib/           # Yapılandırmalar ve kütüphaneler
│   │   └── index.ts      # Giriş noktası
│   ├── prisma/           # Veritabanı şeması ve migration’lar
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React bileşenleri
│   │   ├── pages/        # Sayfa bileşenleri
│   │   ├── hooks/        # Custom React hook’ları
│   │   ├── utils/        # Yardımcı fonksiyonlar
│   │   └── main.tsx     # Giriş noktası
│   ├── package.json
│   └── .env.example
```
